import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, withScope } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  array,
  bigint,
  type InferInput,
  intersect,
  isoTimestamp,
  nullable,
  number,
  object,
  optional,
  parse,
  picklist,
  pipe,
  safeParse,
  string,
  transform,
  union,
} from "valibot";
import { zeroAddress } from "viem";

import database, { credentials } from "../database";
import { previewerAbi } from "../generated/contracts";
import auth from "../middleware/auth";
import publicClient, { AssetTransfer } from "../utils/publicClient";

const WAD = 10n ** 18n;

const app = new Hono();
app.use(auth);

const activityTypes = picklist(["card", "received", "sent"]);

export default app.get(
  "/",
  vValidator("query", optional(object({ include: optional(union([activityTypes, array(activityTypes)])) }), {})),
  async (c) => {
    const { include } = c.req.valid("query");
    function ignore(type: InferInput<typeof activityTypes>) {
      return include && (Array.isArray(include) ? !include.includes(type) : include !== type);
    }

    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      where: eq(credentials.id, credentialId),
      columns: { account: true },
      with: {
        cards: {
          columns: {},
          with: { transactions: { columns: { payload: true } } },
        },
      },
    });
    if (!credential) return c.json("credential not found", 401);
    const account = parse(Address, credential.account);
    async function getAssetTransfers(type: "received" | "sent") {
      if (ignore(type)) return;
      return publicClient.getAssetTransfers({
        category: ["external", "erc20"],
        withMetadata: true,
        excludeZeroValue: true,
        ...{
          received: { toAddress: account },
          sent: { fromAddress: account },
        }[type],
      });
    }
    const [exactly, received, sent] = await Promise.all([
      publicClient.readContract({
        address: previewerAddress,
        functionName: "exactly", // TODO cache
        abi: previewerAbi,
        args: [zeroAddress],
      }),
      getAssetTransfers("received"),
      getAssetTransfers("sent"),
    ]);
    const markets = new Map<Address, (typeof exactly)[number]>(
      exactly.map((market) => [parse(Address, market.asset), market]),
    );
    function transfers(type: "received" | "sent", response: { transfers: readonly AssetTransfer[] } | undefined) {
      if (!response || ignore(type)) return [];
      return response.transfers
        .map((transfer) => {
          const result = safeParse({ received: AssetReceivedActivity, sent: AssetSentActivity }[type], {
            market: markets.get(parse(Address, transfer.rawContract.address)),
            ...transfer,
          });
          if (result.success) return result.output;
          withScope((scope) => {
            scope.setLevel("error");
            scope.setContext("validation", result);
            captureException(new Error("bad transfer"));
          });
        })
        .filter(<T>(value: T | undefined): value is T => value !== undefined);
    }

    return c.json(
      [
        ...credential.cards.flatMap(({ transactions }) =>
          transactions
            .map(({ payload }) => {
              const result = safeParse(CardActivity, payload);
              if (result.success) return result.output;
              withScope((scope) => {
                scope.setLevel("error");
                scope.setContext("validation", result);
                captureException(new Error("bad transaction"));
              });
            })
            .filter(<T>(value: T | undefined): value is T => value !== undefined),
        ),
        ...transfers("received", received),
        ...transfers("sent", sent),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    );
  },
);

export const CardActivity = pipe(
  object({
    operation_id: string(),
    data: object({
      created_at: pipe(string(), isoTimestamp()),
      bill_amount: number(),
      merchant_data: object({
        name: string(),
        country: nullable(string()),
        state: nullable(string()),
        city: nullable(string()),
      }),
      transaction_amount: number(),
      transaction_currency_code: nullable(string()),
    }),
  }),
  transform(({ operation_id, data }) => ({
    type: "card" as const,
    id: operation_id,
    timestamp: data.created_at,
    currency: data.transaction_currency_code,
    amount: data.transaction_amount,
    merchant: {
      name: data.merchant_data.name,
      city: data.merchant_data.city,
      country: data.merchant_data.country,
      state: data.merchant_data.state,
    },
    usdAmount: data.bill_amount,
  })),
);

export const AssetActivity = pipe(
  intersect([AssetTransfer, object({ market: object({ decimals: number(), symbol: string(), usdPrice: bigint() }) })]),
  transform(({ uniqueId, metadata, rawContract, market: { decimals, symbol, usdPrice } }) => {
    const value = BigInt(rawContract.value ?? 0);
    const baseUnit = 10 ** decimals;
    return {
      id: uniqueId,
      timestamp: metadata.blockTimestamp,
      currency: symbol.slice(3),
      amount: Number(value) / baseUnit,
      usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
    };
  }),
);

export const AssetReceivedActivity = pipe(
  AssetActivity,
  transform((activity) => ({ type: "received" as const, ...activity })),
);

export const AssetSentActivity = pipe(
  AssetActivity,
  transform((activity) => ({ type: "sent" as const, ...activity })),
);
