import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setUser, withScope } from "@sentry/node";
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
import publicClient, { type AssetTransfer, ERC20Transfer } from "../utils/publicClient";

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
      columns: { account: true },
      where: eq(credentials.id, credentialId),
      with: {
        cards: {
          columns: {},
          limit: ignore("card") ? 0 : undefined,
          with: { transactions: { columns: { payload: true } } },
        },
      },
    });
    if (!credential) return c.json("credential not found", 401);
    const account = parse(Address, credential.account);
    setUser({ id: account });
    const exactly = await publicClient.readContract({
      abi: previewerAbi,
      address: previewerAddress,
      args: [zeroAddress],
      functionName: "exactly", // TODO cache
    });
    const marketsByAsset = new Map<Address, (typeof exactly)[number]>(
      exactly.map((market) => [parse(Address, market.asset), market]),
    );
    const [received, sent] = await Promise.all(
      (["received", "sent"] as const).map((type) => {
        if (ignore(type)) return;
        return publicClient.getAssetTransfers({
          category: ["erc20"] as const,
          contractAddresses: [...marketsByAsset.keys()],
          excludeZeroValue: true,
          withMetadata: true,
          ...{
            received: { toAddress: account },
            sent: { fromAddress: account },
          }[type],
        });
      }),
    );
    function transfers(type: "received" | "sent", response: { transfers: readonly AssetTransfer[] } | undefined) {
      if (!response || ignore(type)) return [];
      return response.transfers
        .map((transfer) => {
          if (transfer.category !== "erc20") return;
          const market = marketsByAsset.get(parse(Address, transfer.rawContract.address));
          if (!market) return;
          const marketLowercase = market.market.toLowerCase();
          if (
            (type === "received" && transfer.from.toLowerCase() === marketLowercase) ||
            (type === "sent" && transfer.to.toLowerCase() === marketLowercase)
          ) {
            return;
          }
          const result = safeParse({ received: AssetReceivedActivity, sent: AssetSentActivity }[type], {
            market,
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
    data: object({
      bill_amount: number(),
      created_at: pipe(string(), isoTimestamp()),
      merchant_data: object({
        city: nullable(string()),
        country: nullable(string()),
        name: string(),
        state: nullable(string()),
      }),
      transaction_amount: number(),
      transaction_currency_code: nullable(string()),
    }),
    operation_id: string(),
  }),
  transform(({ data, operation_id }) => ({
    amount: data.transaction_amount,
    currency: data.transaction_currency_code,
    id: operation_id,
    merchant: {
      city: data.merchant_data.city,
      country: data.merchant_data.country,
      name: data.merchant_data.name,
      state: data.merchant_data.state,
    },
    timestamp: data.created_at,
    type: "card" as const,
    usdAmount: data.bill_amount,
  })),
);

export const AssetActivity = pipe(
  intersect([ERC20Transfer, object({ market: object({ decimals: number(), symbol: string(), usdPrice: bigint() }) })]),
  transform(({ market: { decimals, symbol, usdPrice }, metadata, rawContract, uniqueId }) => {
    const value = BigInt(rawContract.value);
    const baseUnit = 10 ** decimals;
    return {
      amount: Number(value) / baseUnit,
      currency: symbol.slice(3),
      id: uniqueId,
      timestamp: metadata.blockTimestamp,
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
