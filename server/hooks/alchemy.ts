import { Address, Hash, Hex } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setContext } from "@sentry/node";
import createDebug from "debug";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createHmac } from "node:crypto";
import * as v from "valibot";

if (!process.env.ALCHEMY_SIGNING_KEY) throw new Error("missing alchemy signing key");
const signingKey = process.env.ALCHEMY_SIGNING_KEY;

const debug = createDebug("exa:alchemy");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const app = new Hono();

app.post(
  "/",
  validator("header", async ({ "x-alchemy-signature": signature }, c) => {
    if (
      signature !==
      createHmac("sha256", signingKey)
        .update(Buffer.from(await c.req.arrayBuffer()))
        .digest("hex")
    ) {
      return c.text("unauthorized", 401);
    }
  }),
  vValidator(
    "json",
    v.object({
      webhookId: v.string(),
      id: v.string(),
      createdAt: v.pipe(v.string(), v.isoTimestamp()),
      type: v.literal("ADDRESS_ACTIVITY"),
      event: v.object({
        network: v.string(),
        activity: v.array(
          v.object({
            blockNum: v.string(),
            hash: v.string(),
            fromAddress: Address,
            toAddress: Address,
            value: v.number(),
            erc721TokenId: v.optional(Hex),
            erc1155Metadata: v.optional(v.string()),
            asset: v.string(),
            category: v.string(),
            rawContract: v.object({ rawValue: Hex, address: v.optional(Address), decimals: v.number() }),
            typeTraceAddress: v.optional(v.string()),
            log: v.optional(
              v.object({
                address: Address,
                topics: v.array(Hash),
                data: Hex,
                blockNumber: Hex,
                transactionHash: Hash,
                transactionIndex: Hex,
                blockHash: Hash,
                logIndex: Hex,
                removed: v.boolean(),
              }),
            ),
          }),
        ),
      }),
    }),
    (result, c) => {
      if (!result.success) {
        setContext("validation", result);
        captureException(new Error("bad alchemy"));
        return c.text("bad request", 400);
      }
      if (debug.enabled) debug(JSON.stringify(result.output));
    },
  ),
  (c) => {
    c.req.valid("json");
    return c.json({});
  },
);

export default app;
