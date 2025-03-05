import chain, { exaPluginAbi, exaPluginAddress, upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import { Address, Hash, Hex } from "@exactly/common/validation";
import {
  captureException,
  continueTrace,
  getActiveSpan,
  getTraceData,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  setContext,
  setExtra,
  startSpan,
} from "@sentry/node";
import { deserialize, serialize } from "@wagmi/core";
import createDebug from "debug";
import { Kind, parse, visit, type StringValueNode } from "graphql";
import { Hono } from "hono";
import { setTimeout } from "node:timers/promises";
import * as v from "valibot";
import {
  BaseError,
  CallExecutionError,
  ContractFunctionRevertedError,
  decodeEventLog,
  encodeErrorResult,
  ExecutionRevertedError,
  formatUnits,
} from "viem";
import { optimism, optimismSepolia } from "viem/chains";

import { auditorAbi, marketAbi } from "../generated/contracts";
import { headerValidator, jsonValidator, webhooksKey } from "../utils/alchemy";
import appOrigin from "../utils/appOrigin";
import ensClient from "../utils/ensClient";
import keeper from "../utils/keeper";
import { sendPushNotification } from "../utils/onesignal";
import publicClient from "../utils/publicClient";
import redis from "../utils/redis";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.ALCHEMY_BLOCK_KEY) throw new Error("missing alchemy block key");
const signingKeys = new Set([process.env.ALCHEMY_BLOCK_KEY]);

const debug = createDebug("exa:block");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const Withdraw = v.pipe(
  v.object({
    account: Address,
    market: Address,
    receiver: Address,
    amount: v.bigint(),
    unlock: v.bigint(),
    timestamp: v.optional(v.number()),
    sentryTrace: v.optional(v.string()),
    sentryBaggage: v.optional(v.string()),
  }),
  v.transform((withdraw) => ({
    id: `${withdraw.account}:${withdraw.market}:${withdraw.timestamp ?? Date.now() / 1000}`,
    ...withdraw,
  })),
);

redis
  .zrange("withdraw", 0, Infinity, "BYSCORE")
  .then((messages) => {
    for (const message of messages) scheduleWithdraw(message);
  })
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
            number: v.optional(v.number()), // TODO remove optional after migration
            timestamp: v.number(),
            logs: v.array(
              v.object({ topics: v.tupleWithRest([Hash], Hash), data: Hex, account: v.object({ address: Address }) }),
            ),
          }),
        }),
      }),
    }),
    debug,
    ({ event }) => event.data.block.logs.length > 0,
  ),
  async (c) => {
    const { timestamp, logs } = c.req.valid("json").event.data.block;

    if (logs.length === 0) {
      setExtra("exa.ignore", true);
      return c.json({}, 200);
    }
    setContext("alchemy", await c.req.json());
    getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "alchemy.block");
    const events = logs.map(({ topics, data }) => decodeEventLog({ topics, data, abi: exaPluginAbi }));
    await Promise.all(
      events.map(async (event) => {
        switch (event.eventName) {
          case "Proposed": {
            const withdraw = v.parse(Withdraw, { ...event.args, timestamp });
            return startSpan(
              {
                name: "schedule withdraw",
                op: "queue.publish",
                attributes: {
                  account: withdraw.account,
                  market: withdraw.market,
                  receiver: withdraw.receiver,
                  amount: String(withdraw.amount),
                  unlock: Number(withdraw.unlock),
                  "messaging.message.id": withdraw.id,
                  "messaging.destination.name": "withdraw",
                },
              },
              () => {
                const { "sentry-trace": sentryTrace, baggage: sentryBaggage } = getTraceData();
                withdraw.sentryTrace = sentryTrace;
                withdraw.sentryBaggage = sentryBaggage;
                const message = serialize(withdraw);
                scheduleWithdraw(message);
                return redis.zadd("withdraw", Number(event.args.unlock), message);
              },
            );
          }
        }
      }),
    );
    return c.json({});
  },
);

const noProposal = encodeErrorResult({ errorName: "NoProposal", abi: exaPluginAbi });

function scheduleWithdraw(message: string) {
  const { id, account, market, receiver, amount, unlock, sentryTrace, sentryBaggage } = v.parse(
    Withdraw,
    deserialize(message),
  );
  setTimeout((Number(unlock) + 10) * 1000 - Date.now())
    .then(() =>
      continueTrace({ sentryTrace, baggage: sentryBaggage }, () =>
        startSpan({ name: "exa.withdraw", op: "exa.withdraw" }, (parent) =>
          startSpan(
            {
              name: "process withdraw",
              op: "queue.process",
              attributes: {
                account,
                market,
                receiver,
                amount: String(amount),
                unlock: Number(unlock),
                "messaging.message.id": id,
                "messaging.destination.name": "withdraw",
                "messaging.message.receive.latency": Date.now() - Number(unlock) * 1000,
              },
            },
            async () => {
              const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                publicClient.simulateContract({
                  account: keeper.account,
                  address: account,
                  functionName: "withdraw",
                  abi: [...exaPluginAbi, ...upgradeableModularAccountAbi, ...auditorAbi, marketAbi[6]],
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
              if (receipt.status !== "success") throw new Error("tx reverted");
              parent.setStatus({ code: 1, message: "ok" });
              Promise.all([
                publicClient.readContract({ address: market, abi: marketAbi, functionName: "decimals" }),
                publicClient.readContract({ address: market, abi: marketAbi, functionName: "symbol" }),
                ensClient.getEnsName({ address: receiver }),
              ])
                .then(([decimals, symbol, ensName]) =>
                  sendPushNotification({
                    userId: account,
                    headings: { en: "Withdraw completed" },
                    contents: {
                      en: `${formatUnits(amount, decimals)} ${symbol.slice(3)} sent to ${ensName ?? shortenHex(receiver)}`,
                    },
                  }),
                )
                .catch((error: unknown) => captureException(error));
              return redis.zrem("withdraw", message);
            },
          ).catch((error: unknown) => {
            if (
              error instanceof BaseError &&
              error.cause instanceof ContractFunctionRevertedError &&
              error.cause.data?.errorName === "PreExecHookReverted" &&
              error.cause.data.args?.[2] === noProposal
            ) {
              parent.setStatus({ code: 2, message: "aborted" });
              return redis.zrem("withdraw", message);
            }
            parent.setStatus({ code: 2, message: "failed_precondition" });
            captureException(error);
            if (
              chain.id === optimismSepolia.id &&
              error instanceof BaseError &&
              error.cause instanceof CallExecutionError &&
              error.cause.cause instanceof ExecutionRevertedError
            ) {
              return redis.zrem("withdraw", message);
            }
          }),
        ),
      ),
    )
    .catch((error: unknown) => captureException(error));
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
    let shouldUpdate = false;
    let currentPlugins: string[] = [];
    visit(parse(query.graphql_query), {
      Field(node) {
        if (node.name.value === "block") {
          shouldUpdate ||= !node.selectionSet?.selections.find(
            (selection) => selection.kind === Kind.FIELD && selection.name.value === "number",
          );
        } else if (node.name.value === "logs") {
          const filterArguments = node.arguments?.find(({ name }) => name.value === "filter");
          if (filterArguments?.value.kind === Kind.OBJECT) {
            const addressesField = filterArguments.value.fields.find(({ name }) => name.value === "addresses");
            if (addressesField?.value.kind === Kind.LIST) {
              currentPlugins = addressesField.value.values
                .filter((value): value is StringValueNode => value.kind === Kind.STRING)
                .map(({ value }) => v.parse(Address, value));
              shouldUpdate ||= !currentPlugins.includes(exaPluginAddress);
            }
            const topicsField = filterArguments.value.fields.find(({ name }) => name.value === "topics");
            if (topicsField?.value.kind === Kind.LIST) shouldUpdate ||= topicsField.value.values[0]?.kind !== Kind.LIST;
          }
        }
      },
    });
    if (!shouldUpdate) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

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
    number
    timestamp
    logs(
      filter: {
        addresses: ${JSON.stringify([...currentPlugins, exaPluginAddress])}
        topics: [
          [
            "0x4cf7794d9c19185f7d95767c53e511e2e67ae50f68ece9c9079c6ae83403a3e7" # Proposed
            "0x0c652a21d96e4efed065c3ef5961e4be681be99b95dd55126669ae9be95767e0" # Proposed (legacy)
          ]
        ]
      }
    ) {
      topics
      data
      account {
        address
      }
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
