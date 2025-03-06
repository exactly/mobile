import chain, { exaPluginAddress } from "@exactly/common/generated/chain";
import { type Address, Hash } from "@exactly/common/validation";
import { vValidator } from "@hono/valibot-validator";
import { createHmac } from "node:crypto";
import removeAccents from "remove-accents";
import {
  type BaseIssue,
  type BaseSchema,
  length,
  literal,
  maxLength,
  number,
  object,
  parse,
  picklist,
  pipe,
  string,
} from "valibot";
import { BaseError, ContractFunctionZeroDataError } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { issuerCheckerAddress, upgradeableModularAccountAbi } from "../generated/contracts";
import publicClient from "../utils/publicClient";

const plugin = exaPluginAddress.toLowerCase();

export const pandaIssuing = !!JSON.parse(process.env.PANDA_ISSUING ?? "false");

if (!process.env.PANDA_API_URL) throw new Error("missing panda api url");
const baseURL = process.env.PANDA_API_URL;

if (!process.env.PANDA_API_KEY) throw new Error("missing panda api key");
const key = process.env.PANDA_API_KEY;
export default key;

export function displayName({ first, middle, last }: { first: string; middle: string | null; last: string }) {
  let cardholder = [first, middle, last].filter(Boolean).join(" ");
  if (cardholder.length > 30 && middle) cardholder = `${first} ${last}`;
  return removeAccents(cardholder.slice(0, 30));
}

export async function createCard({
  userId,
  name,
}: {
  userId: string;
  name: { first: string; middle: string | null; last: string };
}) {
  return await request(
    CardResponse,
    `/issuing/users/${userId}/cards`,
    {},
    parse(CreateCardRequest, {
      type: "virtual",
      status: "active",
      limit: { amount: 1_000_000, frequency: "per7DayPeriod" },
      configuration: { displayName: displayName(name) },
    }),
    "POST",
  );
}

export async function createUser(user: {
  accountPurpose: string;
  annualSalary: string;
  expectedMonthlyVolume: string;
  isTermsOfServiceAccepted: true;
  ipAddress: string;
  occupation: string;
  personaShareToken: string;
}) {
  return await request(object({ id: string() }), "/issuing/applications/user", {}, user, "POST");
}

export async function getCard(cardId: string) {
  return await request(CardResponse, `/issuing/cards/${cardId}`);
}

export async function getSecrets(cardId: string, sessionId: string) {
  return await request(PANResponse, `/issuing/cards/${cardId}/secrets`, { SessionId: sessionId });
}

async function request<TInput, TOutput, TIssue extends BaseIssue<unknown>>(
  schema: BaseSchema<TInput, TOutput, TIssue>,
  url: `/${string}`,
  headers = {},
  body?: unknown,
  method: "GET" | "POST" = body === undefined ? "GET" : "POST",
  timeout = 10_000,
) {
  const response = await fetch(`${baseURL}${url}`, {
    method,
    headers: {
      ...headers,
      "Api-Key": key,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return parse(schema, await response.json());
}

const PANResponse = object({
  encryptedPan: object({ iv: string(), data: string() }),
  encryptedCvc: object({ iv: string(), data: string() }),
});

const CreateCardRequest = object({
  type: picklist(["physical", "virtual"]),
  status: picklist(["active", "canceled", "locked", "notActivated"]),
  limit: object({
    amount: number(),
    frequency: picklist([
      "per24HourPeriod",
      "per7DayPeriod",
      "per30DayPeriod",
      "perYearPeriod",
      "allTime",
      "perAuthorization",
    ]),
  }),
  configuration: object({ displayName: pipe(string(), maxLength(30)) }),
});

const CardResponse = object({
  id: string(),
  userId: string(),
  type: literal("virtual"),
  status: picklist(["active", "canceled", "locked", "notActivated"]),
  limit: object({
    amount: number(),
    frequency: picklist([
      "per24HourPeriod",
      "per7DayPeriod",
      "per30DayPeriod",
      "perYearPeriod",
      "allTime",
      "perAuthorization",
    ]),
  }),
  last4: pipe(string(), length(4)),
  expirationMonth: pipe(string(), maxLength(2)),
  expirationYear: pipe(string(), length(4)),
});

export async function isPanda(account: Address) {
  try {
    const installedPlugins = await publicClient.readContract({
      address: account,
      functionName: "getInstalledPlugins",
      abi: upgradeableModularAccountAbi,
    });
    return installedPlugins.some((addr) => plugin === addr.toLowerCase());
  } catch (error) {
    if (error instanceof BaseError && error.cause instanceof ContractFunctionZeroDataError) return true;
    throw error;
  }
}

export function headerValidator() {
  return vValidator("header", object({ signature: string() }), async (r, c) => {
    if (!r.success) return c.text("bad request", 400);
    return r.output.signature ===
      createHmac("sha256", key)
        .update(Buffer.from(await c.req.arrayBuffer()))
        .digest("hex")
      ? undefined
      : c.text("unauthorized", 401);
  });
}

// TODO remove code below
const issuer = privateKeyToAccount(parse(Hash, process.env.ISSUER_PRIVATE_KEY, { message: "invalid private key" }));
export function signIssuerOp({ account, amount, timestamp }: { account: Address; amount: bigint; timestamp: number }) {
  return issuer.signTypedData({
    domain: { chainId: chain.id, name: "IssuerChecker", version: "1", verifyingContract: issuerCheckerAddress },
    types: {
      Collection: [
        { name: "account", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "timestamp", type: "uint40" },
      ],
    },
    primaryType: "Collection",
    message: { account, amount, timestamp },
  });
}
