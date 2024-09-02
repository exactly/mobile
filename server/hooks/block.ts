import { exaPluginAbi, exaPluginAddress } from "@exactly/common/generated/chain";
import { Hash, Hex } from "@exactly/common/types";
import { captureException, getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext, startSpan } from "@sentry/node";
import createDebug from "debug";
import { Hono } from "hono";
import { setTimeout } from "node:timers/promises";
import * as v from "valibot";
import { decodeEventLog } from "viem";

import { headerValidator, jsonValidator } from "../utils/alchemy";
import keeper from "../utils/keeper";
import publicClient from "../utils/publicClient";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.ALCHEMY_BLOCK_KEY) throw new Error("missing alchemy block key");
const signingKey = process.env.ALCHEMY_BLOCK_KEY;

const debug = createDebug("exa:block");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const app = new Hono();

app.post(
  "/",
  headerValidator(signingKey),
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
      events.map((event) => {
        switch (event.eventName) {
          case "Proposed": {
            const { account, market, receiver, amount, unlock } = event.args;
            // TODO use message queue
            return setTimeout((Number(unlock) + 10) * 1000 - Date.now()).then(() =>
              startSpan(
                {
                  name: "exa.withdraw",
                  op: "exa.withdraw",
                  attributes: { account, market, receiver, amount: String(amount), unlock: Number(unlock) },
                },
                async () => {
                  await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
                    publicClient.simulateContract({
                      account: keeper.account,
                      address: account,
                      functionName: "withdraw",
                      abi: exaPluginAbi,
                    }),
                  );
                  const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
                    keeper.writeContract({
                      address: account,
                      functionName: "withdraw",
                      abi: exaPluginAbi,
                      ...transactionOptions,
                    }),
                  );
                  setContext("tx", { transactionHash: hash });
                  const receipt = await startSpan({ name: "tx.wait", op: "tx.wait" }, () =>
                    publicClient.waitForTransactionReceipt({ hash }),
                  );
                  setContext("tx", receipt);
                  if (receipt.status !== "success") captureException(new Error("tx reverted"));
                },
              ),
            );
          }
        }
      }),
    ).catch((error: unknown) => captureException(error));
    return c.json({});
  },
);

export default app;

export const query = `#graphql
{
  block {
    timestamp
    logs(
      filter: {
        addresses: ["${exaPluginAddress}"]
        topics: ["0x0c652a21d96e4efed065c3ef5961e4be681be99b95dd55126669ae9be95767e0"] # Proposed
      }
    ) {
      topics
      data
    }
  }
}`;
