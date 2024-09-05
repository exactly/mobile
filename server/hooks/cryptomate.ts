import chain, { exaPluginAbi, usdcAddress } from "@exactly/common/generated/chain";
import { Address, Hash, Hex } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import {
  captureException,
  getActiveSpan,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  setContext,
  setTag,
  setUser,
  startSpan,
  withScope,
} from "@sentry/node";
import createDebug from "debug";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { Mutex } from "redis-semaphore";
import * as v from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  decodeEventLog,
  encodeEventTopics,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  isHash,
  padHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import database, { cards, credentials, transactions } from "../database/index";
import { issuerCheckerAbi, issuerCheckerAddress } from "../generated/contracts";
import keeper from "../utils/keeper";
import publicClient, { type CallFrame } from "../utils/publicClient";
import redis from "../utils/redis";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.CRYPTOMATE_WEBHOOK_KEY) throw new Error("missing cryptomate webhook key");
if (!process.env.COLLECTOR_ADDRESS) throw new Error("missing collector address");

const MIN_INTERVAL = 24 * 3600;
const MATURITY_INTERVAL = 4 * 7 * 24 * 3600;

const debug = createDebug("exa:cryptomate");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const OperationData = v.object({
  card_id: v.string(),
  bill_amount: v.number(),
  bill_currency_number: v.literal(840),
  bill_currency_code: v.literal("USD"),
  created_at: v.pipe(v.string(), v.isoTimestamp()),
  metadata: v.nullish(v.object({ account: v.nullish(Address) })),
});

const CollectData = v.object({
  ...OperationData.entries,
  metadata: v.object({ account: Address }),
  signature: v.string(),
});

const mutexes = new Map<Address, Mutex>();
function createMutex(account: Address) {
  const mutex = new Mutex(redis, account, { acquireTimeout: 666 });
  mutexes.set(account, mutex);
  return mutex;
}

export default new Hono().post(
  "/",
  vValidator(
    "header",
    v.object({ "x-webhook-key": v.literal(process.env.CRYPTOMATE_WEBHOOK_KEY) }),
    ({ success }, c) => (success ? undefined : c.text("unauthorized", 401)),
  ),
  vValidator(
    "json",
    v.intersect([
      v.variant("event_type", [
        v.object({ event_type: v.literal("AUTHORIZATION"), status: v.literal("PENDING"), data: CollectData }),
        v.variant("status", [
          v.object({ event_type: v.literal("CLEARING"), status: v.literal("PENDING"), data: CollectData }),
          v.object({ event_type: v.literal("CLEARING"), status: v.literal("SUCCESS") }),
          v.object({ event_type: v.literal("CLEARING"), status: v.literal("FAILED") }),
        ]),
        v.object({ event_type: v.literal("DECLINED"), status: v.literal("FAILED") }),
        v.object({ event_type: v.literal("REFUND"), status: v.literal("SUCCESS") }),
        v.object({ event_type: v.literal("REVERSAL"), status: v.literal("SUCCESS") }),
      ]),
      v.object({ product: v.literal("CARDS"), operation_id: v.string(), data: OperationData }),
    ]),
    (result, c) => {
      if (debug.enabled) {
        c.req
          .text()
          .then(debug)
          .catch((error: unknown) => captureException(error));
      }
      if (!result.success) {
        setContext("validation", result);
        captureException(new Error("bad cryptomate"));
        return c.text("bad request", 400);
      }
    },
  ),
  async (c) => {
    const payload = c.req.valid("json");
    setTag("cryptomate.event", payload.event_type);
    setTag("cryptomate.status", payload.status);
    const jsonBody = await c.req.json(); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    setContext("cryptomate", jsonBody); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    const account =
      payload.data.metadata?.account ??
      getAddress(
        await database
          .select({ id: credentials.id, account: credentials.account })
          .from(cards)
          .leftJoin(credentials, eq(cards.credentialId, credentials.id))
          .where(eq(cards.id, payload.data.card_id))
          .limit(1)
          .then(([credential]) => {
            if (!credential?.account) throw new Error("missing credential");
            return credential.account;
          }),
      );
    setUser({ id: account });
    const timestamp = Math.floor(new Date(payload.data.created_at).getTime() / 1000);
    const nextMaturity = timestamp - (timestamp % MATURITY_INTERVAL) + MATURITY_INTERVAL;
    const call = {
      functionName: "collectCredit",
      args: [
        BigInt(nextMaturity - timestamp < MIN_INTERVAL ? nextMaturity + MATURITY_INTERVAL : nextMaturity),
        BigInt(payload.data.bill_amount * 1e6),
        BigInt(timestamp),
        await signIssuerOp({ account, amount: payload.data.bill_amount, timestamp }), // TODO replace with payload signature
      ],
    } as const;
    const transaction = {
      from: keeper.account.address,
      to: account,
      data: encodeFunctionData({ abi: exaPluginAbi, ...call }),
    } as const;
    let mutex = mutexes.get(account);

    switch (payload.event_type) {
      case "AUTHORIZATION":
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.authorization");
        if (!mutex) mutex = createMutex(account);
        try {
          await mutex.acquire();
          const trace = await startSpan({ name: "debug_traceCall", op: "tx.trace" }, () =>
            publicClient.traceCall(transaction),
          );
          if (trace.output) {
            mutex.release().catch((error: unknown) => captureException(error));
            let error: string = trace.output;
            try {
              error = decodeErrorResult({ data: trace.output, abi: [...exaPluginAbi, ...issuerCheckerAbi] }).errorName;
            } catch {} // eslint-disable-line no-empty
            captureException(new Error(error));
            return c.json({ response_code: "69" });
          }
          const transfers = usdcTransfersToCollector(trace);
          if (transfers.length !== 1) {
            mutex.release().catch((error: unknown) => captureException(error));
            debug(`${payload.event_type}:${payload.status}`, payload.operation_id, "no collection");
            return c.json({ response_code: "51" });
          }
          const [{ topics, data }] = transfers as [TransferLog];
          const { args } = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data });
          if (args.value !== call.args[1]) {
            mutex.release().catch((error: unknown) => captureException(error));
            debug(`${payload.event_type}:${payload.status}`, payload.operation_id, "wrong amount");
            return c.json({ response_code: "51" });
          }
          return c.json({ response_code: "00" });
        } catch (error: unknown) {
          mutex.release().catch((error_: unknown) => captureException(error_));
          captureException(error);
          return c.json({ response_code: "05" });
        }
      case "CLEARING":
        if (payload.status !== "PENDING") return c.json({});
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.clearing");
        return startSpan({ name: "collect credit", op: "exa.collect", attributes: { account } }, async () => {
          if (mutex) {
            if (!mutex.isAcquired) return c.json("mutex not acquired", 500);
          } else {
            mutex = createMutex(account);
            await mutex.acquire();
          }
          try {
            const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
              publicClient.simulateContract({
                account: keeper.account,
                address: account,
                abi: [...exaPluginAbi, ...issuerCheckerAbi],
                ...transactionOptions,
                ...call,
              }),
            );
            setContext("tx", request);
            const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
              keeper.writeContract(request),
            );
            setContext("tx", { ...request, transactionHash: hash });
            await database
              .insert(transactions)
              .values([{ id: payload.operation_id, cardId: payload.data.card_id, hash, payload: jsonBody }]);
            startSpan({ name: "tx.wait", op: "tx.wait" }, () => publicClient.waitForTransactionReceipt({ hash }))
              .then((receipt) => {
                setContext("tx", { ...request, ...receipt });
                if (receipt.status === "success") mutex?.release().catch((error: unknown) => captureException(error));
                else {
                  withScope((scope) => {
                    scope.setLevel("fatal");
                    captureException(new Error("tx reverted"));
                  });
                }
              })
              .catch((error: unknown) => captureException(error));
            return c.json({});
          } catch (error: unknown) {
            if (
              (error instanceof BaseError &&
                error.cause instanceof ContractFunctionRevertedError &&
                error.cause.data?.errorName === "Expired") ||
              (error instanceof Error &&
                error.message === 'duplicate key value violates unique constraint "transactions_pkey"')
            ) {
              const tx = await database.query.transactions.findFirst({
                where: and(eq(transactions.id, payload.operation_id), eq(transactions.cardId, payload.data.card_id)),
              });
              if (tx && isHash(tx.hash)) {
                const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash }).catch(() => undefined);
                if (receipt?.status === "success") {
                  await mutex.release();
                  return c.json({});
                }
              }
            }
            withScope((scope) => {
              scope.setLevel("fatal");
              captureException(error);
            });
            return c.text(error instanceof Error ? error.message : String(error), 569 as UnofficialStatusCode);
          }
        });
      default:
        return c.json({});
    }
  },
);

const collectorTopic = padHex(v.parse(Hex, process.env.COLLECTOR_ADDRESS.toLowerCase()));
const [transferTopic] = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer" });
const usdcLowercase = usdcAddress.toLowerCase() as Hex;
function usdcTransfersToCollector({ calls, logs }: CallFrame): TransferLog[] {
  return [
    ...(logs?.filter(
      (log): log is TransferLog =>
        log.address === usdcLowercase && log.topics?.[0] === transferTopic && log.topics[2] === collectorTopic,
    ) ?? []),
    ...(calls?.flatMap(usdcTransfersToCollector) ?? []),
  ];
}

interface TransferLog {
  address: Hex;
  topics: [Hash, Hash, Hash];
  data: Hex;
  position: Hex;
}

// TODO remove code below
const issuer = privateKeyToAccount(v.parse(Hash, process.env.ISSUER_PRIVATE_KEY, { message: "invalid private key" }));
function signIssuerOp({ account, amount, timestamp }: { account: Address; amount: number; timestamp: number }) {
  return issuer.signTypedData({
    domain: { chainId: chain.id, name: "IssuerChecker", version: "1", verifyingContract: issuerCheckerAddress },
    types: {
      Operation: [
        { name: "account", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "timestamp", type: "uint40" },
      ],
    },
    primaryType: "Operation",
    message: { account, amount: BigInt(amount * 1e6), timestamp },
  });
}
