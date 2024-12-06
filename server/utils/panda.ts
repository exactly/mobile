import { Hex } from "@exactly/common/validation";
import { type BaseIssue, type BaseSchema, object, parse, string } from "valibot";

if (!process.env.PANDA_API_URL) throw new Error("missing panda api url");
const baseURL = process.env.PANDA_API_URL;

if (!process.env.PANDA_COLLECTOR) throw new Error("missing panda collector key");
export const collector = parse(Hex, process.env.PANDA_COLLECTOR.toLowerCase());

if (!process.env.PANDA_API_KEY) throw new Error("missing panda api key");
const key = process.env.PANDA_API_KEY;
export default key;

export async function getSecrets(cardId: string, sessionId: string) {
  try {
    return await request(PANResponse, `/issuing/cards/${cardId}/secrets`, { SessionId: sessionId });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.startsWith("404") || error.message.startsWith("400"))) return;
    throw error;
  }
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
