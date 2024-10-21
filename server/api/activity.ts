import { previewerAddress, exaPluginAddress } from "@exactly/common/generated/chain";
import { Address, Hex } from "@exactly/common/validation";
import { WAD } from "@exactly/lib";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setUser, withScope } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  array,
  bigint,
  type InferInput,
  type InferOutput,
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
import { previewerAbi, marketAbi } from "../generated/contracts";
import auth from "../middleware/auth";
import COLLECTOR from "../utils/COLLECTOR";
import publicClient from "../utils/publicClient";

const app = new Hono();
app.use(auth);

const ActivityTypes = picklist(["card", "received", "repay", "sent"]);

const collector = COLLECTOR.toLowerCase();

export default app.get(
  "/",
  vValidator("query", optional(object({ include: optional(union([ActivityTypes, array(ActivityTypes)])) }), {})),
  async (c) => {
    const { include } = c.req.valid("query");
    function ignore(type: InferInput<typeof ActivityTypes>) {
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
          limit: ignore("card") ? 0 : undefined,
        },
      },
    });
    if (!credential) return c.json("credential not found", 401);
    const account = parse(Address, credential.account);
    setUser({ id: account });

    const exactly = await publicClient.readContract({
      address: previewerAddress,
      functionName: "exactly", // TODO cache
      abi: previewerAbi,
      args: [zeroAddress],
    });
    const markets = new Map<Hex, (typeof exactly)[number]>(exactly.map((m) => [m.market.toLowerCase() as Hex, m]));
    const market = (address: Hex) => {
      const found = markets.get(address.toLowerCase() as Hex);
      if (!found) throw new Error("market not found");
      return found;
    };
    const events = await Promise.all([
      ignore("received")
        ? []
        : await publicClient
            .getLogs({
              event: marketAbi[24],
              address: [...markets.keys()],
              args: { caller: account, owner: account },
              toBlock: "latest",
              fromBlock: 0n,
              strict: true,
            })
            .then((logs) =>
              logs.map((log) =>
                parse(DepositActivity, { ...log, market: market(log.address) } satisfies InferInput<
                  typeof DepositActivity
                >),
              ),
            ),
      ignore("repay")
        ? []
        : await publicClient
            .getLogs({
              event: marketAbi[38],
              address: [...markets.keys()],
              args: { caller: exaPluginAddress, borrower: account },
              toBlock: "latest",
              fromBlock: 0n,
              strict: true,
            })
            .then((logs) =>
              logs.map((log) =>
                parse(RepayActivity, { ...log, market: market(log.address) } satisfies InferInput<
                  typeof RepayActivity
                >),
              ),
            ),
      ignore("sent")
        ? []
        : await publicClient
            .getLogs({
              event: marketAbi[49],
              address: [...markets.keys()],
              args: { caller: account, owner: account },
              toBlock: "latest",
              fromBlock: 0n,
              strict: true,
            })
            .then((logs) =>
              logs
                .filter(({ args }) => args.receiver.toLowerCase() !== collector)
                .map((log) =>
                  parse(WithdrawActivity, { ...log, market: market(log.address) } satisfies InferInput<
                    typeof WithdrawActivity
                  >),
                ),
            ),
    ]).then((results) => results.flat());
    const blocks = await Promise.all(
      [...new Set(events.map(({ blockNumber }) => blockNumber))].map((blockNumber) =>
        publicClient.getBlock({ blockNumber }),
      ),
    );
    const timestamps = new Map(
      blocks.map(({ number: block, timestamp }) => [block, new Date(Number(timestamp) * 1000).toISOString()]),
    );

    return c.json(
      [
        ...credential.cards.flatMap(({ transactions }) =>
          transactions.map(({ payload }) => {
            const result = safeParse(CardActivity, payload);
            if (result.success) return result.output;
            withScope((scope) => {
              scope.setLevel("error");
              scope.setContext("validation", result);
              captureException(new Error("bad transaction"));
            });
          }),
        ),
        ...events.map(({ blockNumber, ...event }) => {
          const found = timestamps.get(blockNumber);
          if (found) return { ...event, timestamp: found };
          captureException(new Error("block not found"));
        }),
      ]
        .filter(<T>(value: T | undefined): value is T => value !== undefined)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      200,
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

const OnchainActivity = object({
  args: object({ assets: bigint() }),
  market: object({ decimals: number(), symbol: string(), usdPrice: bigint() }),
  blockNumber: bigint(),
  transactionHash: Hex,
  logIndex: number(),
});

const transformActivity = ({
  args: { assets: value },
  market: { decimals, symbol, usdPrice },
  blockNumber,
  transactionHash,
  logIndex,
}: InferOutput<typeof OnchainActivity>) => {
  const baseUnit = 10 ** decimals;
  return {
    id: `${transactionHash}:${logIndex}`,
    currency: symbol.slice(3),
    amount: Number(value) / baseUnit,
    usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
    blockNumber,
  };
};

export const DepositActivity = pipe(
  OnchainActivity,
  transform((activity) => ({ ...transformActivity(activity), type: "received" as const })),
);

export const RepayActivity = pipe(
  OnchainActivity,
  transform((activity) => ({ ...transformActivity(activity), type: "repay" as const })),
);

export const WithdrawActivity = pipe(
  object({ ...OnchainActivity.entries, args: object({ assets: bigint(), receiver: Address }) }),
  transform((activity) => ({
    ...transformActivity(activity),
    receiver: activity.args.receiver,
    type: "sent" as const,
  })),
);
