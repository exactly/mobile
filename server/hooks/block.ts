import { exaPluginAbi, exaPluginAddress } from "@exactly/common/generated/chain";
import { Hash, Hex } from "@exactly/common/types";
import { getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext } from "@sentry/node";
import createDebug from "debug";
import { Hono } from "hono";
import * as v from "valibot";
import { decodeEventLog } from "viem";

import { headerValidator, jsonValidator } from "../utils/alchemy";

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
    logs.map(({ topics, data }) => decodeEventLog({ topics, data, abi: exaPluginAbi }));
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
