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
import { zeroAddress, decodeEventLog, type GetLogsReturnType } from "viem";

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
    const markets = new Map<Address, (typeof exactly)[number]>(exactly.map((m) => [parse(Address, m.market), m]));
    const [deposits, repays, withdraws] = await Promise.all([
      ignore("received")
        ? []
        : await publicClient.getLogs({
            event: marketAbi.find((item) => item.type === "event" && item.name === "Deposit"),
            address: [...markets.keys()],
            args: { caller: account, owner: account },
            toBlock: "latest",
            fromBlock: 0n,
          }),
      ignore("repay")
        ? []
        : await publicClient.getLogs({
            event: marketAbi.find((item) => item.type === "event" && item.name === "RepayAtMaturity"),
            address: [...markets.keys()],
            args: { caller: exaPluginAddress, borrower: account },
            toBlock: "latest",
            fromBlock: 0n,
          }),
      ignore("sent")
        ? []
        : await publicClient
            .getLogs({
              event: marketAbi.find((item) => item.type === "event" && item.name === "Withdraw"),
              address: [...markets.keys()],
              args: { caller: account, owner: account },
              toBlock: "latest",
              fromBlock: 0n,
            })
            .then((logs) =>
              logs.filter(
                ({ topics, data }) =>
                  decodeEventLog({
                    abi: marketAbi,
                    eventName: "Withdraw",
                    topics,
                    data,
                  }).args.receiver.toLowerCase() !== collector,
              ),
            ),
    ]);
    const blocks = await Promise.all(
      [...new Set([...deposits, ...repays, ...withdraws].map(({ blockNumber }) => blockNumber))].map((blockNumber) =>
        publicClient.getBlock({ blockNumber }),
      ),
    );
    const timestamps = new Map(
      blocks.map(({ number: block, timestamp }) => [block, new Date(Number(timestamp) * 1000).toISOString()]),
    );

    function events(eventName: "Deposit" | "RepayAtMaturity" | "Withdraw", logs: GetLogsReturnType) {
      return logs
        .map(({ address, blockNumber, data, topics, transactionHash, logIndex }) => {
          const event = decodeEventLog({
            abi: marketAbi,
            eventName,
            data,
            topics,
          });
          const result = safeParse(
            { Deposit: DepositActivity, RepayAtMaturity: RepayActivity, Withdraw: WithdrawActivity }[eventName],
            {
              ...event,
              transactionHash,
              logIndex,
              market: markets.get(parse(Address, address)),
              timestamp: timestamps.get(blockNumber),
            },
          );
          if (result.success) return result.output;
          withScope((scope) => {
            scope.setLevel("error");
            scope.setContext("validation", result);
            captureException(new Error(`bad ${eventName}`));
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
        ...events("Deposit", deposits),
        ...events("RepayAtMaturity", repays),
        ...events("Withdraw", withdraws),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
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
  market: object({ decimals: number(), symbol: string(), usdPrice: bigint() }),
  timestamp: pipe(string(), isoTimestamp()),
  transactionHash: Hex,
  logIndex: number(),
});

export const DepositActivity = pipe(
  object({ args: object({ assets: bigint() }), ...OnchainActivity.entries }),
  transform(
    ({ args: { assets: value }, market: { decimals, symbol, usdPrice }, timestamp, transactionHash, logIndex }) => {
      const baseUnit = 10 ** decimals;
      return {
        type: "received" as const,
        id: `${transactionHash}:${logIndex}`,
        currency: symbol.slice(3),
        amount: Number(value) / baseUnit,
        usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
        timestamp,
      };
    },
  ),
);

export const RepayActivity = pipe(
  object({ args: object({ assets: bigint() }), ...OnchainActivity.entries }),
  transform(
    ({ args: { assets: value }, market: { decimals, symbol, usdPrice }, timestamp, transactionHash, logIndex }) => {
      const baseUnit = 10 ** decimals;
      return {
        type: "repay" as const,
        id: `${transactionHash}:${logIndex}`,
        currency: symbol.slice(3),
        amount: Number(value) / baseUnit,
        usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
        timestamp,
      };
    },
  ),
);

export const WithdrawActivity = pipe(
  object({ args: object({ assets: bigint(), receiver: Address }), ...OnchainActivity.entries }),
  transform(
    ({
      args: { assets: value, receiver },
      market: { decimals, symbol, usdPrice },
      timestamp,
      transactionHash,
      logIndex,
    }) => {
      const baseUnit = 10 ** decimals;
      return {
        type: "sent" as const,
        id: `${transactionHash}:${logIndex}`,
        currency: symbol.slice(3),
        amount: Number(value) / baseUnit,
        usdAmount: Number((value * usdPrice) / WAD) / baseUnit,
        timestamp,
        receiver,
      };
    },
  ),
);
