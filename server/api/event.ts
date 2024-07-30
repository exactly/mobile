import chain from "@exactly/common/chain.js";
import { Hex } from "@exactly/common/types.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import createDebug from "debug";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  encodeEventTopics,
  encodeFunctionData,
  erc20Abi,
  type Hash,
  padHex,
} from "viem";

import database, { cards, credentials, transactions } from "../database/index.js";
import { iExaAccountAbi as exaAccountAbi, marketUSDCAddress, usdcAddress } from "../generated/contracts.js";
import accountAddress from "../utils/accountAddress.js";
import handleError from "../utils/handleError.js";
import publicClient, { type CallFrame } from "../utils/publicClient.js";
import signTransactionSync, { signerAddress } from "../utils/signTransactionSync.js";

const debug = createDebug("exa:server:event");
Object.assign(debug, { inspectOpts: { depth: undefined } });

if (!process.env.COLLECTOR_ADDRESS) throw new Error("missing collector address");
const collectorTopic = padHex(v.parse(Hex, process.env.COLLECTOR_ADDRESS.toLowerCase()));
const [transferTopic] = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer" });
const usdcLowercase = usdcAddress.toLowerCase() as Hex;

export default async function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

  if (headers["x-webhook-key"] !== process.env.CRYPTOMATE_WEBHOOK_KEY) return response.status(401).end("unauthorized");

  const payload = v.safeParse(Payload, body);
  if (!payload.success) {
    debug(payload);
    return response.status(400).end("bad request");
  }
  debug(body);

  const cardId = payload.output.data.card_id;
  const [credential] = await database
    .select({ publicKey: credentials.publicKey })
    .from(cards)
    .leftJoin(credentials, eq(cards.credentialId, credentials.id))
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!credential?.publicKey) return response.status(404).end("unknown card");

  try {
    const call = {
      functionName: "borrow",
      args: [marketUSDCAddress, BigInt(payload.output.data.amount * 1e6)],
    } as const;
    const transaction = {
      from: signerAddress,
      to: await accountAddress(credential.publicKey), // TODO make sync
      data: encodeFunctionData({ abi: exaAccountAbi, ...call }),
    } as const;

    const [trace, nonce] = await Promise.all([
      publicClient.traceCall(transaction),
      publicClient.getTransactionCount({ address: signerAddress, blockTag: "pending" }),
    ]);

    const getTransfers = ({ calls, logs }: CallFrame): TransferLog[] => [
      ...(logs?.filter(
        (log): log is TransferLog =>
          log.address === usdcLowercase && log.topics?.[0] === transferTopic && log.topics[2] === collectorTopic,
      ) ?? []),
      ...(calls?.flatMap(getTransfers) ?? []),
    ];
    const transfers = getTransfers(trace);
    if (transfers.length !== 1) return response.json({ response_code: "51" }).end();
    const [{ topics, data }] = transfers as [TransferLog];
    const { args } = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics, data });
    if (args.value !== call.args[1]) return response.json({ response_code: "51" }).end();

    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signTransactionSync({
        ...transaction,
        nonce,
        type: "eip1559",
        chainId: chain.id,
        maxFeePerGas: 1_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
        gas: (BigInt(trace.gasUsed) * 12n) / 10n,
      }),
    });
    debug("hash", hash);

    await database.insert(transactions).values([{ id: payload.output.operation_id, cardId, hash, payload: body }]);

    return response.json({ response_code: "00" }).end();
  } catch (error: unknown) {
    if (error instanceof BaseError && error.cause instanceof ContractFunctionRevertedError) {
      switch (error.cause.data?.errorName) {
        case "InsufficientAccountLiquidity":
          return response.json({ response_code: "51" }).end();
        default:
          handleError(error);
          return response.json({ response_code: "05" }).end();
      }
    }
    handleError(error);
    return response.json({ response_code: "05" }).end();
  }
}

const Payload = v.variant("event_type", [
  v.object({
    event_type: v.literal("AUTHORIZATION"),
    status: v.literal("PENDING"),
    product: v.literal("CARDS"),
    operation_id: v.string(),
    data: v.object({
      card_id: v.string(),
      amount: v.number(),
      currency_number: v.literal(840),
      currency_code: v.literal("USD"),
      exchange_rate: v.number(),
      channel: v.picklist(["ECOMMERCE", "POS", "ATM", "Visa Direct"]),
      created_at: v.pipe(v.string(), v.isoTimestamp()),
      fees: v.object({ atm_fees: v.number(), fx_fees: v.number() }),
      merchant_data: v.object({
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
]);

type TransferLog = { address: Hex; topics: [Hash, Hash, Hash]; data: Hex; position: Hex };
