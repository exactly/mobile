import { type Address, Hex } from "@exactly/common/validation";
import { type BaseIssue, type BaseSchema, number, object, parse, picklist, string } from "valibot";

import { upgradeableModularAccountAbi } from "../generated/contracts";
import publicClient from "../utils/publicClient";

if (!process.env.PANDA_MIGRATION_PLUGIN) throw new Error("missing panda migration plugin address");
const plugin = parse(Hex, process.env.PANDA_MIGRATION_PLUGIN.toLowerCase());

if (!process.env.PANDA_API_URL) throw new Error("missing panda api url");
const baseURL = process.env.PANDA_API_URL;

if (!process.env.PANDA_COLLECTOR) throw new Error("missing panda collector key");
export const collector = parse(Hex, process.env.PANDA_COLLECTOR.toLowerCase());

if (!process.env.PANDA_API_KEY) throw new Error("missing panda api key");
const key = process.env.PANDA_API_KEY;
export default key;

export async function getSecrets(cardId: string, sessionId: string) {
  return await request(PANResponse, `/issuing/cards/${cardId}/secrets`, { SessionId: sessionId });
}

export async function getCard(cardId: string) {
  return await request(CardResponse, `/issuing/cards/${cardId}`);
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

const CardResponse = object({
  id: string(),
  userId: string(),
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
  last4: string(),
  expirationMonth: string(),
  expirationYear: string(),
});

export async function isPanda(account: Address): Promise<boolean> {
  return await publicClient
    .readContract({
      address: account,
      functionName: "getInstalledPlugins",
      abi: upgradeableModularAccountAbi,
    })
    .then((plugins) => plugins.map((p) => parse(Hex, p.toLowerCase())).includes(plugin));
}
