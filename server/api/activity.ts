import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, withScope } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  array,
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
import publicClient, { type AssetTransfer } from "../utils/publicClient";

const WAD = 10n ** 18n;

const app = new Hono();
app.use(auth);

export default app.get(
  "/",
  vValidator(
    "query",
    optional(
      object({
        include: optional(
          union([picklist(["card", "received", "sent"]), array(picklist(["card", "received", "sent"]))]),
        ),
      }),
      {},
    ),
  ),
  async (c) => {
    const { include } = c.req.valid("query");
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
      if (include && (Array.isArray(include) ? !include.includes(type) : include !== type)) return;
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
      if (!response || (include && (Array.isArray(include) ? !include.includes(type) : include !== type))) return [];
      return response.transfers
        .filter(({ rawContract }) => rawContract.address && markets.has(parse(Address, rawContract.address)))
        .map(({ uniqueId, metadata, rawContract }) => {
          const { decimals, symbol, usdPrice } = markets.get(parse(Address, rawContract.address))!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
          const value = BigInt(rawContract.value ?? 0);
          const baseUnit = 10 ** decimals;
          return {
            type,
            id: uniqueId,
            timestamp: metadata.blockTimestamp,
            currency: symbol.slice(3),
            amount: Number(value) / baseUnit,
            usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
          };
        });
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
