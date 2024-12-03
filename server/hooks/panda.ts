import MIN_BORROW_INTERVAL from "@exactly/common/MIN_BORROW_INTERVAL";
import chain, {
  exaPluginAbi,
  installmentsPreviewerAbi,
  installmentsPreviewerAddress,
  upgradeableModularAccountAbi,
  usdcAddress,
} from "@exactly/common/generated/chain";
import { Address, Hash, type Hex } from "@exactly/common/validation";
import { MATURITY_INTERVAL, splitInstallments } from "@exactly/lib";
import { vValidator } from "@hono/valibot-validator";
import {
  captureException,
  getActiveSpan,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  setContext,
  setTag,
  setUser,
  startSpan,
} from "@sentry/node";
import createDebug from "debug";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { UnofficialStatusCode } from "hono/utils/http-status";
import { createHmac } from "node:crypto";
import * as v from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  decodeEventLog,
  encodeEventTopics,
  encodeFunctionData,
  erc20Abi,
  isHash,
  maxUint256,
  padHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import database, { cards, transactions } from "../database/index";
import { auditorAbi, issuerCheckerAbi, issuerCheckerAddress, marketAbi } from "../generated/contracts";
import keeper from "../utils/keeper";
import key, { collector } from "../utils/panda";
import publicClient from "../utils/publicClient";
import { track } from "../utils/segment";
import traceClient, { type CallFrame } from "../utils/traceClient";
import transactionOptions from "../utils/transactionOptions";

const debug = createDebug("exa:panda");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const BaseTransaction = v.object({
  id: v.string(),
  type: v.string(),
  spend: v.object({
    amount: v.number(),
    currency: v.literal("usd"),
    cardId: v.string(),
    cardType: v.literal("virtual"),
    status: v.picklist(["pending", "reversed", "declined", "completed"]),
  }),
});

const Payload = v.intersect([
  v.variant("action", [
    v.object({ action: v.literal("created") }),
    v.object({ action: v.literal("updated") }),
    v.object({
      action: v.literal("requested"),
      body: v.object({
        ...BaseTransaction.entries,
        id: v.optional(v.string()),
        spend: { ...BaseTransaction.entries.spend, status: v.picklist(["pending", "declined"]) },
      }),
    }),
    v.object({
      action: v.literal("completed"),
      body: v.object({
        ...BaseTransaction.entries,
        spend: { ...BaseTransaction.entries.spend, status: v.literal("completed") },
      }),
    }),
  ]),
  v.object({ resource: v.literal("transaction"), body: BaseTransaction }),
]);

export default new Hono().post(
  "/",
  vValidator("header", v.object({ signature: v.string() }), async (r, c) => {
    if (!r.success) return c.text("bad request", 400);
    return r.output.signature ===
      createHmac("sha256", key)
        .update(Buffer.from(await c.req.arrayBuffer()))
        .digest("hex")
      ? undefined
      : c.text("unauthorized", 401);
  }),
  vValidator("json", Payload, (validation, c) => {
    if (debug.enabled) {
      c.req
        .text()
        .then(debug)
        .catch((error: unknown) => captureException(error));
    }
    if (!validation.success) {
      captureException(new Error("bad panda"), { contexts: { validation } });
      return c.text("bad request", 400);
    }
  }),
  async (c) => {
    const payload = c.req.valid("json");
    setTag("panda.event", payload.action);
    setTag("panda.status", payload.body.spend.status);
    const jsonBody = await c.req.json(); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    setContext("panda", jsonBody); // eslint-disable-line @typescript-eslint/no-unsafe-argument

    switch (payload.action) {
      case "requested": {
        const { account, amount, call, transaction } = await prepareCollection(payload);
        const authorize = () => {
          track({
            userId: account,
            event: "TransactionAuthorized",
            properties: { usdAmount: payload.body.spend.amount }, //has different decimals than cryptomate
          });
          return c.json({});
        };
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "panda.authorization");
        if (!transaction) return authorize();
        try {
          const trace = await startSpan({ name: "debug_traceCall", op: "tx.trace" }, () =>
            traceClient.traceCall(transaction),
          );
          if (trace.output) {
            let error: string = trace.output;
            try {
              error = decodeErrorResult({
                data: trace.output,
                abi: [
                  ...exaPluginAbi,
                  ...issuerCheckerAbi,
                  ...upgradeableModularAccountAbi,
                  ...auditorAbi,
                  ...marketAbi,
                ],
              }).errorName;
            } catch {} // eslint-disable-line no-empty
            captureException(new Error(error), { contexts: { tx: { call, trace } } });
            return c.json({}, 400);
          }
          if (
            usdcTransfersToCollector(trace).reduce(
              (total, { topics, data }) =>
                total + decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data }).args.value,
              0n,
            ) !== amount
          ) {
            debug(`${payload.action}:${payload.body.spend.status}`, payload.body.id, "bad collection");
            captureException(new Error("bad collection"), { level: "warning", contexts: { tx: { call, trace } } });
            return c.json({}, 400);
          }
          return authorize();
        } catch (error: unknown) {
          captureException(error, { contexts: { tx: { call } } });
          return c.json({}, 500);
        }
      }
      case "created": {
        if (payload.body.spend.status !== "pending") return c.json({});
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "panda.clearing");
        const { account, call } = await prepareCollection(payload);
        if (!call) return c.json({});
        return startSpan({ name: "collect credit", op: "exa.collect", attributes: { account } }, async () => {
          try {
            const collect = {
              account: keeper.account,
              address: account,
              abi: [...exaPluginAbi, ...issuerCheckerAbi, ...upgradeableModularAccountAbi],
              ...transactionOptions,
            };
            const { request } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () => {
              if (call.functionName === "collectDebit") return publicClient.simulateContract({ ...collect, ...call });
              if (call.functionName === "collectCredit") return publicClient.simulateContract({ ...collect, ...call });
              return publicClient.simulateContract({ ...collect, ...call });
            });
            setContext("tx", { call, ...request });
            const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
              keeper.writeContract(request as Parameters<typeof keeper.writeContract>[0]),
            );
            setContext("tx", { call, ...request, transactionHash: hash });
            await database.insert(transactions).values([
              {
                id: payload.body.id,
                cardId: payload.body.spend.cardId,
                hash,
                payload: { ...jsonBody, createdAt: new Date().toISOString(), type: "panda" },
              },
            ]);
            startSpan({ name: "tx.wait", op: "tx.wait" }, () => publicClient.waitForTransactionReceipt({ hash }))
              .then((receipt) => {
                if (receipt.status === "success") return;
                captureException(new Error("tx reverted"), {
                  level: "fatal",
                  contexts: { tx: { call, ...request, ...receipt } },
                });
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
                where: and(eq(transactions.id, payload.body.id), eq(transactions.cardId, payload.body.spend.cardId)),
              });
              if (tx && isHash(tx.hash)) {
                const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash }).catch(() => undefined);
                if (receipt?.status === "success") return c.json({});
              }
            }
            captureException(error, { level: "fatal", contexts: { tx: { call } } });
            return c.text(error instanceof Error ? error.message : String(error), 569 as UnofficialStatusCode);
          }
        });
      }
      default:
        return c.json({});
    }
  },
);

async function prepareCollection(payload: v.InferOutput<typeof Payload>) {
  const card = await database.query.cards.findFirst({
    columns: { mode: true },
    where: and(eq(cards.id, payload.body.spend.cardId), eq(cards.status, "ACTIVE")),
    with: { credential: { columns: { account: true } } },
  });
  if (!card) throw new Error("card not found");
  const account = v.parse(Address, card.credential.account);
  setUser({ id: account });
  setTag("exa.mode", card.mode);
  const amount = BigInt(Math.round(payload.body.spend.amount * 1e4));
  if (amount === 0n) return { account, amount, call: null, transaction: null };
  const call = await (async () => {
    //const timestamp = Math.floor(new Date(payload.data.created_at).getTime() / 1000);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signIssuerOp({ account, amount: payload.body.spend.amount, timestamp }); // TODO replace with payload signature
    if (card.mode === 0) {
      return { functionName: "collectDebit", args: [amount, BigInt(timestamp), signature] } as const;
    }
    const nextMaturity = timestamp - (timestamp % MATURITY_INTERVAL) + MATURITY_INTERVAL;
    const firstMaturity =
      nextMaturity - timestamp < MIN_BORROW_INTERVAL ? nextMaturity + MATURITY_INTERVAL : nextMaturity;
    if (card.mode === 1 || payload.body.spend.amount * 100 < card.mode || payload.action === "requested") {
      return {
        functionName: "collectCredit",
        args: [BigInt(firstMaturity + (card.mode - 1) * MATURITY_INTERVAL), amount, BigInt(timestamp), signature],
      } as const;
    }
    const preview = await startSpan({ name: "query onchain state", op: "exa.preview" }, () =>
      publicClient.readContract({
        abi: installmentsPreviewerAbi,
        address: installmentsPreviewerAddress,
        functionName: "preview",
      }),
    );
    setContext("preview", preview);
    const installments = startSpan({ name: "split installments", op: "exa.split" }, () =>
      splitInstallments(
        amount,
        preview.floatingAssets,
        firstMaturity,
        preview.fixedUtilizations.length,
        preview.fixedUtilizations
          .filter(
            ({ maturity }) => maturity >= firstMaturity && maturity < firstMaturity + card.mode * MATURITY_INTERVAL,
          )
          .map(({ utilization }) => utilization),
        preview.floatingUtilization,
        preview.globalUtilization,
        preview.interestRateModel,
      ),
    );
    setContext("installments", installments);
    return {
      functionName: "collectInstallments",
      args: [BigInt(firstMaturity), installments.amounts, maxUint256, BigInt(timestamp), signature],
    } as const;
  })();
  setContext("tx", { call });
  return {
    account,
    amount,
    call,
    transaction: {
      from: keeper.account.address,
      to: account,
      data: encodeFunctionData({ abi: exaPluginAbi, ...call }),
    } as const,
  };
}

const collectorTopic = padHex(collector);
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
    message: { account, amount: BigInt(Math.round(amount * 1e4)), timestamp },
  });
}
