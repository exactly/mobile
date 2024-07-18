import { getEntryPoint } from "@alchemy/aa-core";
import accountInitCode from "@exactly/common/accountInitCode.js";
import { chain } from "@exactly/common/constants.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import {
  type Address,
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  getAddress,
  type Hash,
} from "viem";
import { getContractError, getEstimateGasError } from "viem/utils";

import exaUSDC from "../../node_modules/@exactly/protocol/deployments/op-sepolia/MarketUSDC.json" with { type: "json" }; // HACK fix ts-node monorepo resolution
import database, { cards, credentials, transactions } from "../database/index.js";
import client from "../utils/chainClient.js";
import decodePublicKey from "../utils/decodePublicKey.js";
import handleError from "../utils/handleError.js";

export default async function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

  const payload = v.safeParse(Payload, body);
  if (!payload.success) return response.status(400).json(payload); // HACK for debugging

  const cardId = payload.output.data.card_id;
  const [credential] = await database
    .select({ publicKey: credentials.publicKey })
    .from(cards)
    .leftJoin(credentials, eq(cards.credentialId, credentials.id))
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!credential?.publicKey) return response.status(404).end("unknown card");

  let x: Hash, y: Hash;
  try {
    ({ x, y } = decodePublicKey(credential.publicKey));
  } catch (error) {
    return response.status(400).end(error instanceof Error ? error.message : error);
  }

  let accountAddress: Address;
  try {
    const initCode = accountInitCode({ x, y });
    const { address, abi } = getEntryPoint(chain, { version: "0.6.0" });
    await client.simulateContract({ address, abi, functionName: "getSenderAddress", args: [initCode] }); // TODO calculate locally
    return response.status(502).end("unable to get account address");
  } catch (error: unknown) {
    if (
      error instanceof ContractFunctionExecutionError &&
      error.cause instanceof ContractFunctionRevertedError &&
      error.cause.data?.errorName === "SenderAddressResult" &&
      error.cause.data.args?.length === 1
    ) {
      accountAddress = error.cause.data.args[0] as Address;
    } else {
      handleError(error);
      return response.status(502).end("unable to get account address");
    }
  }

  try {
    const call = {
      functionName: "borrow",
      args: [getAddress(exaUSDC.address), BigInt(payload.output.data.amount * 1e6)],
    };

    const transaction = {
      from: client.account.address,
      to: accountAddress,
      data: encodeFunctionData({
        abi: [{ type: "function", name: "borrow", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }],
        ...call,
      }),
    };

    const [gas, nonce] = await Promise.all([
      client
        .request({ method: "eth_estimateGas", params: [transaction] })
        .then(BigInt)
        .catch((error: unknown) => {
          throw getContractError(getEstimateGasError(error as BaseError, {}), {
            abi: [{ type: "error", name: "InsufficientAccountLiquidity", inputs: [] }],
            ...call,
          }) as Error;
        }),
      client.getTransactionCount({ address: client.account.address, blockTag: "pending" }),
    ]);

    if (gas < 30_000n) return response.json({ response_code: "51" }).end(); // account not deployed // HACK needs success check

    const serializedTransaction = await client.account.signTransaction({
      ...transaction,
      chainId: chain.id,
      type: "eip1559",
      gas,
      nonce,
      maxFeePerGas: 1_000_000n,
      maxPriorityFeePerGas: 1_000_000n,
    });
    const hash = await client.sendRawTransaction({ serializedTransaction });

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
      exchange_rate: v.null(),
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
type Payload = v.InferOutput<typeof Payload>; // eslint-disable-line @typescript-eslint/no-redeclare
