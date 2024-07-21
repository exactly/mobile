import { chain } from "@exactly/common/constants.js";
import { auditorAbi, marketAbi } from "@exactly/common/generated/contracts.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import createDebug from "debug";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { BaseError, ContractFunctionRevertedError, encodeFunctionData, getAddress } from "viem";
import { getContractError, getEstimateGasError } from "viem/utils";

import exaUSDC from "../../node_modules/@exactly/protocol/deployments/op-sepolia/MarketUSDC.json" with { type: "json" }; // HACK fix ts-node monorepo resolution
import database, { cards, credentials, transactions } from "../database/index.js";
import { iExaAccountAbi as exaAccountAbi } from "../generated/contracts.js";
import accountAddress from "../utils/accountAddress.js";
import handleError from "../utils/handleError.js";
import publicClient from "../utils/publicClient.js";
import signTransactionSync, { signerAddress } from "../utils/signTransactionSync.js";

const debug = createDebug("exa:server:event");

export default async function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

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
      args: [getAddress(exaUSDC.address), BigInt(payload.output.data.amount * 1e6)],
    } as const;

    const transaction = {
      from: signerAddress,
      to: await accountAddress(credential.publicKey), // TODO make sync
      data: encodeFunctionData({ abi: exaAccountAbi, ...call }),
    } as const;

    const [gas, nonce] = await Promise.all([
      publicClient
        .request({ method: "eth_estimateGas", params: [transaction] })
        .then(BigInt)
        .catch((error: unknown) => {
          throw getContractError(getEstimateGasError(error as BaseError, {}), {
            abi: [...exaAccountAbi, ...marketAbi, ...auditorAbi],
            ...call,
          }) as Error;
        }),
      publicClient.getTransactionCount({ address: signerAddress, blockTag: "pending" }),
    ]);

    if (gas < 30_000n) return response.json({ response_code: "51" }).end(); // account not deployed // HACK needs success check

    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signTransactionSync({
        ...transaction,
        gas,
        nonce,
        type: "eip1559",
        chainId: chain.id,
        maxFeePerGas: 1_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
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
        post_code: v.string(),
        state: v.nullable(v.string()),
        country: v.string(),
        mcc_category: v.string(),
        mcc_code: v.string(),
      }),
    }),
  }),
]);
type Payload = v.InferOutput<typeof Payload>; // eslint-disable-line @typescript-eslint/no-redeclare
