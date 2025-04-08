import chain from "@exactly/common/generated/chain";
import { Address, Hash } from "@exactly/common/validation";
import removeAccents from "remove-accents";
import * as v from "valibot";
import { privateKeyToAccount } from "viem/accounts";
import { optimism, optimismSepolia } from "viem/chains";

import { track } from "./segment";
import { issuerCheckerAddress } from "../generated/contracts";

if (!process.env.CRYPTOMATE_URL || !process.env.CRYPTOMATE_API_KEY) throw new Error("missing cryptomate vars");
const baseURL = process.env.CRYPTOMATE_URL;
const apiKey = process.env.CRYPTOMATE_API_KEY;

export async function createCard({
  account,
  email,
  name,
  phone,
  limits,
}: {
  account: Address;
  email: string;
  name: { first: string; middle: string | null; last: string };
  phone: { countryCode: string; number: string };
  limits: { daily: number; weekly: number; monthly: number };
}) {
  let cardholder = [name.first, name.middle, name.last].filter(Boolean).join(" ");
  if (cardholder.length > 26 && name.middle) cardholder = `${name.first} ${name.last}`;
  const card = await request(
    CardResponse,
    "/cards/virtual-cards/create",
    v.parse(CreateCardRequest, {
      email,
      card_holder_name: removeAccents(cardholder.slice(0, 26)),
      phone_country_code: phone.countryCode,
      phone: phone.number,
      approval_method: "DEFI",
      daily_limit: limits.daily,
      weekly_limit: limits.weekly,
      monthly_limit: limits.monthly,
      metadata: { account },
    }),
  );
  track({ event: "CardIssued", userId: account });
  return card;
}

export async function setLimits(
  cardId: string,
  { daily, weekly, monthly }: { daily: number; weekly: number; monthly: number },
) {
  return request(
    CardResponse,
    `/cards/virtual-cards/${cardId}/limits`,
    v.parse(SetLimitsRequest, { daily_limit: daily, weekly_limit: weekly, monthly_limit: monthly }),
    "PATCH",
  );
}

export async function getPAN(cardId: string) {
  const { url } = await request(PANResponse, `/cards/virtual-cards/${cardId}/pan-html`);
  return url;
}

async function request<TInput, TOutput, TIssue extends v.BaseIssue<unknown>>(
  schema: v.BaseSchema<TInput, TOutput, TIssue>,
  url: `/${string}`,
  body?: unknown,
  method: "GET" | "POST" | "PATCH" = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(`${baseURL}${url}`, {
    method,
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return v.parse(schema, await response.json());
}

export const collectors: Address[] = (
  {
    [optimism.id]: ["0x0f25bA5b8B0BA4Ff4dF645fDE030652da60BabA6", "0x471e5F3428D5C50543072c817a9D0CcBa8ed7D5F"],
  }[chain.id] ?? ["0xDb90CDB64CfF03f254e4015C4F705C3F3C834400"]
).map((address) => v.parse(Address, address));

const CreateCardRequest = v.object({
  card_holder_name: v.string(),
  email: v.pipe(v.string(), v.email()),
  phone_country_code: v.pipe(v.string(), v.regex(/^\d{1,4}$/)),
  phone: v.pipe(v.string(), v.regex(/^\d+$/)),
  approval_method: v.literal("DEFI"),
  daily_limit: v.number(),
  weekly_limit: v.number(),
  monthly_limit: v.number(),
  metadata: v.object({ account: Address }),
});

const SetLimitsRequest = v.object({
  daily_limit: v.number(),
  weekly_limit: v.number(),
  monthly_limit: v.number(),
});

const CardResponse = v.object({
  id: v.string(),
  card_holder_name: v.string(),
  type: v.literal("Virtual"),
  last4: v.pipe(v.string(), v.regex(/^\d{4}$/)),
  status: v.literal("ACTIVE"),
  daily_limit: v.number(),
  weekly_limit: v.number(),
  monthly_limit: v.number(),
});

const PANResponse = v.object({ url: v.pipe(v.string(), v.url()) });

const checker =
  {
    [optimism.id]: "0xD3dEA3b447859413D8a055954E4fB9409c7B744E",
    [optimismSepolia.id]: "0x23b6714abf4a62800d9be1227bfe60142dc62d6b",
  }[chain.id] ?? issuerCheckerAddress;

// TODO remove code below
const issuer = privateKeyToAccount(
  v.parse(Hash, process.env.CRYPTOMATE_ISSUER_PRIVATE_KEY, { message: "invalid private key" }),
);
export function signIssuerOp({ account, amount, timestamp }: { account: Address; amount: bigint; timestamp: number }) {
  return issuer.signTypedData({
    domain: { chainId: chain.id, name: "IssuerChecker", version: "1", verifyingContract: v.parse(Address, checker) },
    types: {
      Operation: [
        { name: "account", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "timestamp", type: "uint40" },
      ],
    },
    primaryType: "Operation",
    message: { account, amount, timestamp },
  });
}
