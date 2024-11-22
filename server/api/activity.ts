import { previewerAddress, exaPluginAddress, marketUSDCAddress } from "@exactly/common/generated/chain";
import { Address, Hash, type Hex } from "@exactly/common/validation";
import { effectiveRate, ONE_YEAR, WAD } from "@exactly/lib";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setUser } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  array,
  bigint,
  type InferInput,
  type InferOutput,
  isoTimestamp,
  length,
  minLength,
  nullish,
  number,
  object,
  optional,
  parse,
  picklist,
  pipe,
  safeParse,
  string,
  transform,
  undefined_,
  union,
} from "valibot";
import { withRetry, zeroAddress } from "viem";

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
          with: { transactions: { columns: { hash: true, payload: true } } },
          limit: ignore("card") ? 0 : undefined,
        },
      },
    });
    if (!credential) return c.json("credential not found", 401);
    const account = parse(Address, credential.account);
    setUser({ id: account });

    const exactly = await withRetry(
      () =>
        publicClient.readContract({
          address: previewerAddress,
          functionName: "exactly",
          abi: previewerAbi,
          args: [zeroAddress],
        }),
      { delay: 100, retryCount: 5 },
    );

    const markets = new Map<Hex, (typeof exactly)[number]>(exactly.map((m) => [m.market.toLowerCase() as Hex, m]));
    const market = (address: Hex) => {
      const found = markets.get(address.toLowerCase() as Hex);
      if (!found) throw new Error("market not found");
      return found;
    };
    const [deposits, repays, withdraws, borrows] = await Promise.all([
      ignore("received")
        ? []
        : publicClient
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
        : publicClient
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
        : publicClient
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
      ignore("card")
        ? undefined
        : publicClient
            .getLogs({
              event: marketAbi[22],
              address: marketUSDCAddress,
              args: { borrower: account },
              toBlock: "latest",
              fromBlock: 0n,
              strict: true,
            })
            .then((logs) =>
              logs.reduce((map, { args, transactionHash, blockNumber }) => {
                const data = map.get(transactionHash);
                if (!data) return map.set(transactionHash, { blockNumber, events: [args] });
                data.events.push(args);
                return map;
              }, new Map<Hash, { blockNumber: bigint; events: (typeof logs)[number]["args"][] }>()),
            ),
    ]);
    const blocks = await Promise.all(
      [
        ...new Set(
          [...deposits, ...repays, ...withdraws, ...(borrows?.values() ?? [])].map(({ blockNumber }) => blockNumber),
        ),
      ].map((blockNumber) => publicClient.getBlock({ blockNumber })),
    );
    const timestamps = new Map(blocks.map(({ number: block, timestamp }) => [block, timestamp]));

    return c.json(
      [
        ...credential.cards.flatMap(({ transactions }) =>
          transactions.map(({ hash, payload }) => {
            const borrow = borrows?.get(hash as Hash);
            const validation = safeParse(
              { 0: DebitActivity, 1: CreditActivity }[borrow?.events.length ?? 0] ?? InstallmentsActivity,
              {
                ...(payload as object),
                events: borrow?.events,
                blockTimestamp: borrow?.blockNumber && timestamps.get(borrow.blockNumber),
              },
            );
            if (validation.success) return validation.output;
            captureException(new Error("bad transaction"), { level: "error", contexts: { validation } });
          }),
        ),
        ...[...deposits, ...repays, ...withdraws].map(({ blockNumber, ...event }) => {
          const timestamp = timestamps.get(blockNumber);
          if (timestamp) return { ...event, timestamp: new Date(Number(timestamp) * 1000).toISOString() };
          captureException(new Error("block not found"), {
            level: "error",
            contexts: { event: { ...event, timestamp } },
          });
        }),
      ]
        .filter(<T>(value: T | undefined): value is T => value !== undefined)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      200,
    );
  },
);

const Borrow = object({ maturity: bigint(), assets: bigint(), fee: bigint() });
const CardActivity = object({
  operation_id: string(),
  data: object({
    created_at: pipe(string(), isoTimestamp()),
    bill_amount: number(),
    merchant_data: object({
      name: string(),
      country: nullish(string()),
      state: nullish(string()),
      city: nullish(string()),
    }),
    transaction_amount: number(),
    transaction_currency_code: nullish(string()),
  }),
  hash: Hash,
});

function fixedRate({ maturity, assets, fee }: InferOutput<typeof Borrow>, timestamp: bigint) {
  return ((((assets + fee) * WAD) / assets - WAD) * ONE_YEAR) / (maturity - timestamp);
}

function transformBorrow(borrow: InferOutput<typeof Borrow>, timestamp: bigint) {
  return { fee: Number(borrow.fee) / 1e6, rate: Number(fixedRate(borrow, timestamp)) / 1e18 };
}

function transformCard({ operation_id, data, hash }: InferOutput<typeof CardActivity>) {
  return {
    type: "card" as const,
    id: operation_id,
    transactionHash: hash,
    timestamp: data.created_at,
    currency: data.transaction_currency_code,
    amount: data.transaction_amount,
    usdAmount: data.bill_amount,
    merchant: {
      name: data.merchant_data.name,
      city: data.merchant_data.city,
      country: data.merchant_data.country,
      state: data.merchant_data.state,
    },
  };
}

export const DebitActivity = pipe(
  object({ ...CardActivity.entries, events: undefined_(), blockTimestamp: undefined_() }),
  transform((activity) => ({ ...transformCard(activity), mode: 0 as const })),
);

export const CreditActivity = pipe(
  object({ ...CardActivity.entries, events: pipe(array(Borrow), length(1)), blockTimestamp: optional(bigint()) }),
  transform((activity) => ({
    ...transformCard(activity),
    mode: 1 as const,
    borrow: transformBorrow(
      activity.events[0]!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
      activity.blockTimestamp ?? BigInt(Math.floor(new Date(activity.data.created_at).getTime() / 1000)),
    ),
  })),
);

export const InstallmentsActivity = pipe(
  object({ ...CardActivity.entries, events: pipe(array(Borrow), minLength(2)), blockTimestamp: optional(bigint()) }),
  transform((activity) => {
    const { data, events, blockTimestamp } = activity;
    const timestamp = blockTimestamp ?? BigInt(Math.floor(new Date(data.created_at).getTime() / 1000));
    events.sort((a, b) => Number(a.maturity) - Number(b.maturity));
    return {
      ...transformCard(activity),
      mode: events.length,
      borrow: {
        fee: Number(events.reduce((sum, { fee }) => sum + fee, 0n)) / 1e6,
        rate:
          Number(
            effectiveRate(
              events.reduce((sum, { assets }) => sum + assets, 0n),
              Number(events[0]!.maturity), // eslint-disable-line @typescript-eslint/no-non-null-assertion
              events.map(({ assets, fee }) => assets + fee),
              events.map((borrow) => fixedRate(borrow, timestamp)),
              Number(timestamp),
            ),
          ) / 1e18,
        installments: events.map((borrow) => transformBorrow(borrow, timestamp)),
      },
    };
  }),
);

const OnchainActivity = object({
  args: object({ assets: bigint() }),
  market: object({ decimals: number(), symbol: string(), usdPrice: bigint() }),
  blockNumber: bigint(),
  transactionHash: Hash,
  logIndex: number(),
});

function transformActivity({
  args: { assets: value },
  market: { decimals, symbol, usdPrice },
  blockNumber,
  transactionHash,
  logIndex,
}: InferOutput<typeof OnchainActivity>) {
  const baseUnit = 10 ** decimals;
  return {
    id: `${transactionHash}:${logIndex}`,
    currency: symbol.slice(3),
    amount: Number(value) / baseUnit,
    usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
    blockNumber,
    transactionHash,
  };
}

export const DepositActivity = pipe(
  OnchainActivity,
  transform((activity) => ({ ...transformActivity(activity), type: "received" as const })),
);

export const RepayActivity = pipe(
  object({ ...OnchainActivity.entries, args: object({ assets: bigint(), positionAssets: bigint() }) }),
  transform((activity) => ({
    ...transformActivity(activity),
    positionAmount: Number(activity.args.positionAssets) / 10 ** activity.market.decimals,
    type: "repay" as const,
  })),
);

export const WithdrawActivity = pipe(
  object({ ...OnchainActivity.entries, args: object({ assets: bigint(), receiver: Address }) }),
  transform((activity) => ({
    ...transformActivity(activity),
    receiver: activity.args.receiver,
    type: "sent" as const,
  })),
);

/* eslint-disable @typescript-eslint/no-redeclare */
export type DebitActivity = InferOutput<typeof DebitActivity>;
export type CreditActivity = InferOutput<typeof CreditActivity>;
export type InstallmentsActivity = InferOutput<typeof InstallmentsActivity>;
export type DepositActivity = InferOutput<typeof DepositActivity>;
export type RepayActivity = InferOutput<typeof RepayActivity>;
export type WithdrawActivity = InferOutput<typeof WithdrawActivity>;
export type OnchainActivity = InferOutput<typeof OnchainActivity>;
/* eslint-enable @typescript-eslint/no-redeclare */
