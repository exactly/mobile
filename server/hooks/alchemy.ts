import chain, { auditorAbi, auditorAddress, marketAbi, wethAddress } from "@exactly/common/generated/chain";
import { AddressLax } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setContext } from "@sentry/node";
import createDebug from "debug";
import { inArray } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { createHmac } from "node:crypto";
import * as v from "valibot";
import { getAddress, isAddress } from "viem";
import { optimism } from "viem/chains";

import database, { credentials } from "../database";
import publicClient from "../utils/publicClient";
import redis from "../utils/redis";

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
      type: v.literal("ADDRESS_ACTIVITY"),
      event: v.object({
        network: v.literal(chain.id === optimism.id ? "OPT_MAINNET" : "OPT_SEPOLIA"),
        activity: v.array(
          v.intersect([
            v.object({ fromAddress: AddressLax, toAddress: AddressLax }),
            v.variant("category", [
              v.object({
                category: v.picklist(["external", "internal"]),
                asset: v.literal("ETH"),
                rawContract: v.object({ address: v.undefined() }),
                value: v.number(),
              }),
              v.object({
                category: v.picklist(["token", "erc20", "erc721", "erc1155"]),
                asset: v.string(),
                rawContract: v.object({ address: AddressLax }),
                value: v.optional(v.number()),
              }),
            ]),
          ]),
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
  async (c) => {
    const { activity } = c.req.valid("json").event;
    const transfers = activity.filter(
      ({ category, value }) => category !== "erc721" && category !== "erc1155" && value,
    );
    const accounts = await database.query.credentials
      .findMany({
        columns: { account: true, publicKey: true },
        where: inArray(credentials.account, [...new Set(transfers.map(({ toAddress }) => toAddress))]),
      })
      .then((result) =>
        Object.fromEntries(result.map(({ account, publicKey }) => [getAddress(account), publicKey] as const)),
      );
    await Promise.all(
      transfers.map(async ({ toAddress: account, rawContract }) => {
        if (!accounts[account]) return;
        const asset = rawContract.address ?? wethAddress;
        await redis.hgetall(`${String(chain.id)}:${asset}`).then(async (found) => {
          if (found.market && isAddress(found.market) && !Number.isNaN(Number(found.index))) {
            return { address: found.market, index: Number(found.index) };
          }
          const markets = await publicClient.readContract({
            address: auditorAddress,
            functionName: "allMarkets",
            abi: auditorAbi,
          });
          return Object.fromEntries(
            await Promise.all(
              markets.map(async (address, index) => {
                const underlying = await publicClient.readContract({ address, functionName: "asset", abi: marketAbi });
                redis
                  .hset(`${String(chain.id)}:${underlying}`, { market: address, index })
                  .catch((error: unknown) => captureException(error));
                return [underlying, { address, index }] as const;
              }),
            ),
          )[asset];
        });
      }),
    );
    return c.json({});
  },
);

export default app;
