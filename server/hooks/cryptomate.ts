import MIN_BORROW_INTERVAL from "@exactly/common/MIN_BORROW_INTERVAL";
import chain, {
  exaPluginAbi,
  previewerAddress,
  upgradeableModularAccountAbi,
  usdcAddress,
} from "@exactly/common/generated/chain";
import { Address, Hash, type Hex } from "@exactly/common/validation";
import { fixedUtilization, globalUtilization, MATURITY_INTERVAL, splitInstallments } from "@exactly/lib";
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
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import database, { cards, transactions } from "../database/index";
import { auditorAbi, issuerCheckerAbi, issuerCheckerAddress, marketAbi, previewerAbi } from "../generated/contracts";
import COLLECTOR from "../utils/COLLECTOR";
import keeper from "../utils/keeper";
import publicClient from "../utils/publicClient";
import traceClient, { type CallFrame } from "../utils/traceClient";
import transactionOptions from "../utils/transactionOptions";

if (!process.env.CRYPTOMATE_WEBHOOK_KEY) throw new Error("missing cryptomate webhook key");

const debug = createDebug("exa:cryptomate");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const OperationData = v.object({
  card_id: v.string(),
  bill_amount: v.number(),
  bill_currency_number: v.literal("840"),
  bill_currency_code: v.literal("USD"),
  created_at: v.pipe(v.string(), v.isoTimestamp()),
  metadata: v.nullish(v.object({ account: v.nullish(Address) })),
});

const CollectData = v.object({
  ...OperationData.entries,
  metadata: v.object({ account: Address }),
  signature: v.string(),
});

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
    (validation, c) => {
      if (debug.enabled) {
        c.req
          .text()
          .then(debug)
          .catch((error: unknown) => captureException(error));
      }
      if (!validation.success) {
        captureException(new Error("bad cryptomate"), { contexts: { validation } });
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
    const card = await database.query.cards.findFirst({
      columns: { mode: true },
      where: and(eq(cards.id, payload.data.card_id), eq(cards.status, "ACTIVE")),
      with: { credential: { columns: { account: true } } },
    });
    if (!card) return c.json("card not found", 404);
    const account = v.parse(Address, card.credential.account);
    setUser({ id: account });
    const amount = BigInt(Math.round(payload.data.bill_amount * 1e6));
    const call = await (async () => {
      const timestamp = Math.floor(new Date(payload.data.created_at).getTime() / 1000);
      const signature = await signIssuerOp({ account, amount: payload.data.bill_amount, timestamp }); // TODO replace with payload signature
      if (card.mode === 0) {
        return { functionName: "collectDebit", args: [amount, BigInt(timestamp), signature] } as const;
      }
      const nextMaturity = timestamp - (timestamp % MATURITY_INTERVAL) + MATURITY_INTERVAL;
      const firstMaturity =
        nextMaturity - timestamp < MIN_BORROW_INTERVAL ? nextMaturity + MATURITY_INTERVAL : nextMaturity;
      if (card.mode === 1) {
        return {
          functionName: "collectCredit",
          args: [BigInt(firstMaturity), amount, BigInt(timestamp), signature],
        } as const;
      }
      const exactly = await publicClient.readContract({
        address: previewerAddress,
        functionName: "exactly",
        args: [zeroAddress],
        abi: previewerAbi,
      });
      const market = exactly.find(({ asset }) => asset === usdcAddress);
      if (!market) throw new Error("usdc market not found");
      const { amounts } = splitInstallments(
        amount,
        market.totalFloatingDepositAssets,
        firstMaturity,
        market.fixedPools.length,
        market.fixedPools
          .filter(
            ({ maturity }) => maturity >= firstMaturity && maturity < firstMaturity + card.mode * MATURITY_INTERVAL,
          )
          .map(({ supplied, borrowed }) => fixedUtilization(supplied, borrowed, market.totalFloatingDepositAssets)),
        market.floatingUtilization,
        globalUtilization(
          market.totalFloatingDepositAssets,
          market.totalFloatingBorrowAssets,
          market.floatingBackupBorrowed,
        ),
        market.interestRateModel.parameters,
      );
      return {
        functionName: "collectInstallments",
        args: [BigInt(firstMaturity), amounts, maxUint256, BigInt(timestamp), signature],
      } as const;
    })();
    const transaction = {
      from: keeper.account.address,
      to: account,
      data: encodeFunctionData({ abi: exaPluginAbi, ...call }),
    } as const;

    switch (payload.event_type) {
      case "AUTHORIZATION":
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.authorization");
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
            return c.json({ response_code: "69" });
          }
          if (
            usdcTransfersToCollector(trace).reduce(
              (total, { topics, data }) =>
                total + decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data }).args.value,
              0n,
            ) !== amount
          ) {
            debug(`${payload.event_type}:${payload.status}`, payload.operation_id, "bad collection");
            captureException(new Error("bad collection"), { level: "warning", contexts: { tx: { call, trace } } });
            return c.json({ response_code: "51" });
          }
          return c.json({ response_code: "00" });
        } catch (error: unknown) {
          captureException(error, { contexts: { tx: { call } } });
          return c.json({ response_code: "05" });
        }
      case "CLEARING":
        if (payload.status !== "PENDING") return c.json({});
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.clearing");
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
            setContext("tx", request);
            const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
              keeper.writeContract(request as Parameters<typeof keeper.writeContract>[0]),
            );
            setContext("tx", { ...request, transactionHash: hash });
            await database
              .insert(transactions)
              .values([{ id: payload.operation_id, cardId: payload.data.card_id, hash, payload: jsonBody }]);
            startSpan({ name: "tx.wait", op: "tx.wait" }, () => publicClient.waitForTransactionReceipt({ hash }))
              .then((receipt) => {
                if (receipt.status === "success") return;
                captureException(new Error("tx reverted"), {
                  level: "fatal",
                  contexts: { tx: { ...request, ...receipt } },
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
                where: and(eq(transactions.id, payload.operation_id), eq(transactions.cardId, payload.data.card_id)),
              });
              if (tx && isHash(tx.hash)) {
                const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash }).catch(() => undefined);
                if (receipt?.status === "success") return c.json({});
              }
            }
            captureException(error, { level: "fatal" });
            return c.text(error instanceof Error ? error.message : String(error), 569 as UnofficialStatusCode);
          }
        });
      default:
        return c.json({});
    }
  },
);

const collectorTopic = padHex(COLLECTOR);
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
    message: { account, amount: BigInt(Math.round(amount * 1e6)), timestamp },
  });
}
