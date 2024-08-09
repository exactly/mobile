import chain from "@exactly/common/chain";
import { Hex } from "@exactly/common/types";
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
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  encodeEventTopics,
  encodeFunctionData,
  erc20Abi,
  type Hash,
  nonceManager,
  padHex,
} from "viem";

import database, { cards, credentials, transactions } from "../database/index";
import { iExaAccountAbi as exaAccountAbi, marketUSDCAddress, usdcAddress } from "../generated/contracts";
import deriveAddress from "../utils/deriveAddress";
import publicClient, { type CallFrame } from "../utils/publicClient";
import signTransactionSync, { signerAddress } from "../utils/signTransactionSync";

const debug = createDebug("exa:server:event");
Object.assign(debug, { inspectOpts: { depth: undefined } });

if (!process.env.CRYPTOMATE_WEBHOOK_KEY) throw new Error("missing cryptomate webhook key");
if (!process.env.COLLECTOR_ADDRESS) throw new Error("missing collector address");

const app = new Hono();

app.post(
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
        v.object({ event_type: v.literal("AUTHORIZATION"), status: v.literal("PENDING") }),
        v.object({ event_type: v.literal("CLEARING"), status: v.picklist(["PENDING", "SUCCESS", "FAILED"]) }),
        v.object({ event_type: v.literal("DECLINED"), status: v.literal("FAILED") }),
        v.object({ event_type: v.literal("REFUND"), status: v.literal("SUCCESS") }),
        v.object({ event_type: v.literal("REVERSAL"), status: v.literal("SUCCESS") }),
      ]),
      v.looseObject({
        product: v.literal("CARDS"),
        operation_id: v.string(),
        data: v.looseObject({
          card_id: v.string(),
          amount: v.number(),
          currency_number: v.literal(840),
          currency_code: v.literal("USD"),
          exchange_rate: v.nullable(v.number()),
          channel: v.picklist(["ECOMMERCE", "POS", "ATM", "Visa Direct"]),
          created_at: v.pipe(v.string(), v.isoTimestamp()),
          fees: v.looseObject({ atm_fees: v.number(), fx_fees: v.number() }),
          merchant_data: v.looseObject({
            id: v.string(),
            name: v.string(),
            city: v.string(),
            post_code: v.nullable(v.string()),
            state: v.nullable(v.string()),
            country: v.string(),
            mcc_category: v.string(),
            mcc_code: v.string(),
          }),
        }),
      }),
    ]),
    (result, c) => {
      if (!result.success) {
        setContext("validation", result);
        captureException(new Error("bad cryptomate"));
        return c.text("bad request", 400);
      }
      if (debug.enabled) debug(JSON.stringify(result.output));
    },
  ),
  async (c) => {
    const payload = c.req.valid("json");
    setTag("cryptomate.event", payload.event_type);
    setTag("cryptomate.status", payload.status);
    setContext("cryptomate", payload);
    const [credential] = await database
      .select({ id: credentials.id, publicKey: credentials.publicKey })
      .from(cards)
      .leftJoin(credentials, eq(cards.credentialId, credentials.id))
      .where(eq(cards.id, payload.data.card_id))
      .limit(1);
    if (!credential?.id || !credential.publicKey) return c.json({ response_code: "05" }, 404);

    const accountAddress = deriveAddress(credential.publicKey);
    setUser({ id: accountAddress, username: credential.id });
    const call = {
      functionName: "borrow",
      args: [marketUSDCAddress, BigInt(payload.data.amount * 1e6)],
    } as const;
    const transaction = {
      from: signerAddress,
      to: accountAddress,
      data: encodeFunctionData({ abi: exaAccountAbi, ...call }),
    } as const;

    switch (payload.event_type) {
      case "AUTHORIZATION":
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.authorization");
        try {
          const transfers = usdcTransfersToCollector(
            await startSpan({ name: "debug_traceCall", op: "tx.trace" }, () => publicClient.traceCall(transaction)),
          );
          if (transfers.length !== 1) return c.json({ response_code: "51" });
          const [{ topics, data }] = transfers as [TransferLog];
          const { args } = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data });
          if (args.value !== call.args[1]) return c.json({ response_code: "51" });
          return c.json({ response_code: "00" });
        } catch (error: unknown) {
          if (error instanceof BaseError && error.cause instanceof ContractFunctionRevertedError) {
            switch (error.cause.data?.errorName) {
              case "InsufficientAccountLiquidity":
                return c.json({ response_code: "51" });
              default:
                captureException(error);
                return c.json({ response_code: "05" });
            }
          }
          captureException(error);
          return c.json({ response_code: "05" });
        }
      case "CLEARING": {
        if (payload.status !== "PENDING") return c.json({});
        getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "cryptomate.clearing");
        const nonce = await startSpan({ name: "tx.nonce", op: "tx.nonce" }, () =>
          nonceManager.consume({ address: signerAddress, chainId: chain.id, client: publicClient }),
        );
        setContext("tx", { nonce });
        const hash = await startSpan({ name: "eth_sendRawTransaction", op: "tx.send" }, () =>
          publicClient.sendRawTransaction({
            serializedTransaction: signTransactionSync({
              ...transaction,
              nonce,
              type: "eip1559",
              chainId: chain.id,
              maxFeePerGas: 1_000_000n,
              maxPriorityFeePerGas: 1_000_000n,
              gas: 2_000_000n,
            }),
          }),
        );
        setContext("tx", { hash });
        const [receipt] = await Promise.all([
          startSpan({ name: "tx.wait", op: "tx.wait" }, () => publicClient.waitForTransactionReceipt({ hash })),
          database
            .insert(transactions)
            .values([{ id: payload.operation_id, cardId: payload.data.card_id, hash, payload }]),
        ]);
        setContext("tx", receipt);
        if (receipt.status !== "success") {
          withScope((scope) => {
            scope.setLevel("fatal");
            captureException(new Error("tx reverted"));
          });
        }
        return c.json({});
      }
      default:
        return c.json({});
    }
  },
);

export default app;

const collectorTopic = padHex(v.parse(Hex, process.env.COLLECTOR_ADDRESS.toLowerCase()));
const [transferTopic] = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer" });
const usdcLowercase = usdcAddress.toLowerCase() as Hex;
type TransferLog = { address: Hex; topics: [Hash, Hash, Hash]; data: Hex; position: Hex };
function usdcTransfersToCollector({ calls, logs }: CallFrame): TransferLog[] {
  return [
    ...(logs?.filter(
      (log): log is TransferLog =>
        log.address === usdcLowercase && log.topics?.[0] === transferTopic && log.topics[2] === collectorTopic,
    ) ?? []),
    ...(calls?.flatMap(usdcTransfersToCollector) ?? []),
  ];
}
