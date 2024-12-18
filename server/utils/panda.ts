import { type Address, Hex } from "@exactly/common/validation";
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

import { upgradeableModularAccountAbi } from "../generated/contracts";
import publicClient from "../utils/publicClient";

if (!process.env.PANDA_ISSUE_ENABLED) throw new Error("missing panda issue enabled");
export const issueEnabled = process.env.PANDA_ISSUE_ENABLED === "true";

if (!process.env.PANDA_MIGRATION_PLUGIN) throw new Error("missing panda migration plugin address");
const plugin = parse(Hex, process.env.PANDA_MIGRATION_PLUGIN.toLowerCase());

if (!process.env.PANDA_API_URL) throw new Error("missing panda api url");
const baseURL = process.env.PANDA_API_URL;

if (!process.env.PANDA_COLLECTOR) throw new Error("missing panda collector key");
export const collector = parse(Hex, process.env.PANDA_COLLECTOR.toLowerCase());

if (!process.env.PANDA_API_KEY) throw new Error("missing panda api key");
const key = process.env.PANDA_API_KEY;
export default key;

export async function createCard({
  userId,
  name,
}: {
  userId: string;
  name: { first: string; middle: string | null; last: string };
}) {
  let cardholder = [name.first, name.middle, name.last].filter(Boolean).join(" ");
  if (cardholder.length > 30 && name.middle) cardholder = `${name.first} ${name.last}`;
  return await request(
    CardResponse,
    `/issuing/users/${userId}/cards`,
    {},
    parse(CreateCardRequest, {
      type: "virtual",
      status: "active",
      limit: { amount: 10_000, frequency: "per7DayPeriod" },
      configuration: { displayName: removeAccents(cardholder.slice(0, 30)) },
    }),
    "POST",
  );
}

export async function createUser(user: {
  firstName: string;
  lastName: string;
  birthDate: string;
  nationalId: string;
  countryOfIssue: string;
  email: string;
  address: {
    line1: string;
    line2: string | undefined;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    country: string;
  };
  phoneCountryCode: string;
  phoneNumber: string;
  ipAddress: string;
  occupation: string;
  annualSalary: string;
  accountPurpose: string;
  expectedMonthlyVolume: string;
  isTermsOfServiceAccepted: true;
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

export async function isPanda(account: Address): Promise<boolean> {
  return await publicClient
    .readContract({
      address: account,
      functionName: "getInstalledPlugins",
      abi: upgradeableModularAccountAbi,
    })
    .then((plugins) => plugins.map((p) => parse(Hex, p.toLowerCase())).includes(plugin));
}
