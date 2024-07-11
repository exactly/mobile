import { getEntryPoint } from "@alchemy/aa-core";
import accountInitCode from "@exactly/common/accountInitCode.js";
import { chain } from "@exactly/common/constants.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as v from "valibot";
import {
  type Address,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  getAddress,
  type Hash,
} from "viem";

import exaUSDC from "../../node_modules/@exactly/protocol/deployments/op-sepolia/MarketUSDC.json" with { type: "json" }; // HACK fix ts-node monorepo resolution
import database, { transactions } from "../database/index.js";
import client from "../utils/chainClient.js";
import decodePublicKey from "../utils/decodePublicKey.js";
import handleError from "../utils/handleError.js";

export default async function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

  const payload = v.safeParse(Payload, body);
  if (!payload.success) return response.status(400).json(payload); // HACK for debugging

  const { card_id: cardId } = payload.output.data;
  const card = await database.query.cards.findFirst({
    where: (cards, { eq }) => eq(cards.id, cardId),
    with: { credential: { columns: { publicKey: true } } },
    columns: {},
  });
  if (!card) return response.status(400).end("unknown card");

  let x: Hash, y: Hash;
  try {
    ({ x, y } = decodePublicKey(card.credential.publicKey));
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

  let simulation: Awaited<ReturnType<typeof client.simulateContract>>;
  try {
    simulation = await client.simulateContract({
      address: accountAddress,
      abi: [{ type: "function", name: "borrow", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }],
      functionName: "borrow",
      args: [getAddress(exaUSDC.address), BigInt(payload.output.data.amount * 1e6)],
    });
  } catch {
    return response.json({ response_code: "51" }).end();
  }
  const hash = await client.writeContract(simulation.request);

  await database.insert(transactions).values([{ id: payload.output.operation_id, cardId, hash, payload: body }]);

  return response.json({ response_code: "00" }).end();
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
