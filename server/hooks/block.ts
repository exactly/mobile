import chain, { exaPluginAbi, exaPluginAddress, upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import { Address, Hash, Hex } from "@exactly/common/validation";
import { captureException, getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext, startSpan } from "@sentry/node";
import { deserialize, serialize } from "@wagmi/core";
import createDebug from "debug";
import { Kind, parse, visit, type StringValueNode } from "graphql";
import { Hono } from "hono";
import { setTimeout } from "node:timers/promises";
import * as v from "valibot";
import { decodeEventLog } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

import { headerValidator, jsonValidator, webhooksKey } from "../utils/alchemy";
import appOrigin from "../utils/appOrigin";
import keeper from "../utils/keeper";
import publicClient from "../utils/publicClient";
import redis from "../utils/redis";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.ALCHEMY_BLOCK_KEY) throw new Error("missing alchemy block key");
const signingKeys = new Set([process.env.ALCHEMY_BLOCK_KEY]);

const debug = createDebug("exa:block");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const Withdraw = v.object({
  account: Address,
  market: Address,
  receiver: Address,
  amount: v.bigint(),
  unlock: v.bigint(),
});

redis
  .zrange("withdraw", 0, Infinity, "BYSCORE")
  .then((results) =>
    Promise.allSettled(results.map((withdraw) => scheduleWithdraw(v.parse(Withdraw, deserialize(withdraw))))),
  )
  .catch((error: unknown) => captureException(error));

const app = new Hono();

export default app.post(
  "/",
  headerValidator(() => signingKeys),
  jsonValidator(
    v.object({
      type: v.literal("GRAPHQL"),
      event: v.object({
        data: v.object({
          block: v.object({
            timestamp: v.number(),
            logs: v.array(v.object({ topics: v.tupleWithRest([Hash], Hash), data: Hex })),
          }),
        }),
      }),
    }),
    debug,
    ({ event }) => event.data.block.logs.length > 0,
  ),
  async (c) => {
    const { logs } = c.req.valid("json").event.data.block;
    if (logs.length === 0) return c.json({});
    setContext("alchemy", await c.req.json());
    getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "alchemy.block");
    const events = logs.map(({ topics, data }) => decodeEventLog({ topics, data, abi: exaPluginAbi }));
    Promise.allSettled(
      events.map(async (event) => {
        switch (event.eventName) {
          case "Proposed":
            await redis.zadd("withdraw", Number(event.args.unlock), serialize(v.parse(Withdraw, event.args)));
            return scheduleWithdraw({
              ...event.args,
              account: v.parse(Address, event.args.account),
              market: v.parse(Address, event.args.market),
              receiver: v.parse(Address, event.args.receiver),
            });
        }
      }),
    ).catch((error: unknown) => captureException(error));
    return c.json({});
  },
);

async function scheduleWithdraw({ account, market, receiver, amount, unlock }: v.InferOutput<typeof Withdraw>) {
  return setTimeout((Number(unlock) + 10) * 1000 - Date.now()).then(() =>
    startSpan(
      {
        name: "exa.withdraw",
        op: "exa.withdraw",
        attributes: { account, market, receiver, amount: String(amount), unlock: Number(unlock) },
      },
      async () => {
        const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
          publicClient.simulateContract({
            account: keeper.account,
            address: account,
            functionName: "withdraw",
            abi: [...exaPluginAbi, ...upgradeableModularAccountAbi],
            ...transactionOptions,
          }),
        );
        setContext("tx", request);
        const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
          keeper.writeContract(request),
        );
        setContext("tx", { ...request, transactionHash: hash });
        const receipt = await startSpan({ name: "tx.wait", op: "tx.wait" }, () =>
          publicClient.waitForTransactionReceipt({ hash }),
        );
        setContext("tx", { ...request, ...receipt });
        if (receipt.status !== "success") captureException(new Error("tx reverted"));
        return redis.zrem("withdraw", serialize(v.parse(Withdraw, { account, market, receiver, amount, unlock })));
      },
    ).catch((error: unknown) => captureException(error)),
  );
}

const alchemyInit = { headers: { "Content-Type": "application/json", "X-Alchemy-Token": webhooksKey } };
fetch("https://dashboard.alchemy.com/api/team-webhooks", alchemyInit)
  .then(async (webhooksResponse) => {
    if (!webhooksResponse.ok) throw new Error(`${webhooksResponse.status} ${await webhooksResponse.text()}`);

    const url = `${appOrigin}/hooks/block`;
    const network = { [optimism.id]: "OPT_MAINNET", [optimismSepolia.id]: "OPT_SEPOLIA" }[chain.id];

    const { data: webhooks } = (await webhooksResponse.json()) as {
      data: [
        {
          id: string;
          network: string;
          webhook_type: string;
          webhook_url: string;
          signing_key: string;
          is_active: boolean;
        },
      ];
    };
    const currentHook = webhooks.find(
      (hook) =>
        hook.is_active && hook.webhook_type === "GRAPHQL" && hook.network === network && hook.webhook_url === url,
    );
    if (!currentHook) throw new Error("missing webhook");
    signingKeys.add(currentHook.signing_key);

    const queryResponse = await fetch(
      `https://dashboard.alchemy.com/api/dashboard-webhook-graphql-query?webhook_id=${currentHook.id}`,
      alchemyInit,
    );
    if (!queryResponse.ok) throw new Error(`${queryResponse.status} ${await queryResponse.text()}`);
    const { data: query } = (await queryResponse.json()) as { data: { graphql_query: string } };
    let currentPlugins: string[] = [];
    visit(parse(query.graphql_query), {
      Field(node) {
        if (node.name.value === "logs") {
          const filterArguments = node.arguments?.find(({ name }) => name.value === "filter");
          if (filterArguments?.value.kind === Kind.OBJECT) {
            const addressesField = filterArguments.value.fields.find(({ name }) => name.value === "addresses");
            if (addressesField && addressesField.value.kind === Kind.LIST) {
              currentPlugins = addressesField.value.values
                .filter((value): value is StringValueNode => value.kind === Kind.STRING)
                .map(({ value }) => v.parse(Address, value));
            }
          }
        }
      },
    });
    if (currentPlugins.includes(exaPluginAddress)) return;

    const createResponse = await fetch("https://dashboard.alchemy.com/api/create-webhook", {
      ...alchemyInit,
      method: "POST",
      body: JSON.stringify({
        network,
        webhook_type: "GRAPHQL",
        webhook_url: url,
        graphql_query: `#graphql
          {
            block {
              timestamp
              logs(
                filter: {
                  addresses: ${JSON.stringify([...currentPlugins, exaPluginAddress])}
                  topics: ["0x0c652a21d96e4efed065c3ef5961e4be681be99b95dd55126669ae9be95767e0"] # Proposed
                }
              ) {
                topics
                data
              }
            }
          }`,
      }),
    });
    if (!createResponse.ok) throw new Error(`${createResponse.status} ${await createResponse.text()}`);
    const { data: newHook } = (await createResponse.json()) as { data: { signing_key: string } };
    signingKeys.add(newHook.signing_key);
    const deleteResponse = await fetch(
      `https://dashboard.alchemy.com/api/delete-webhook?webhook_id=${currentHook.id}`,
      { ...alchemyInit, method: "DELETE" },
    );
    if (!deleteResponse.ok) throw new Error(`${deleteResponse.status} ${await deleteResponse.text()}`);
    await setTimeout(5000);
    signingKeys.delete(currentHook.signing_key);
  })
  .catch((error: unknown) => captureException(error));
