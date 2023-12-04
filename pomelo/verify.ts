import { type ExpoRequest, ExpoResponse } from "expo-router/server";
import crypto from "node:crypto";

import { pomeloApiKey, pomeloApiSecret } from "../utils/constants";

const secrets = {
  [pomeloApiKey]: pomeloApiSecret,
} as const;

export function verifySignature(request: ExpoRequest, rawBody: string) {
  const endpoint = request.headers.get("x-endpoint");
  const timestamp = request.headers.get("x-timestamp");
  let signature = request.headers.get("x-signature");
  const apiKey = request.headers.get("x-api-key");

  if (!endpoint || !timestamp || !apiKey || !signature) {
    return false;
  }

  const secret = secrets[apiKey];
  if (!secret) {
    return false;
  }

  if (signature.startsWith("hmac-sha256")) {
    signature = signature.replace("hmac-sha256 ", "");
  } else {
    return false;
  }

  const hmac = crypto
    .createHmac("sha256", Buffer.from(secret, "base64"))
    .update(timestamp)
    .update(endpoint)
    .update(rawBody);

  const hash = hmac.digest("base64");
  const hashBytes = Buffer.from(hash, "base64");

  const signatureBytes = Buffer.from(signature, "base64");
  return crypto.timingSafeEqual(hashBytes, signatureBytes);
}

export async function signResponse(request: ExpoRequest, response: ExpoResponse): Promise<ExpoResponse> {
  const endpoint = request.headers.get("x-endpoint");
  const apiKey = request.headers.get("x-api-key");
  if (!endpoint || !apiKey) {
    return new ExpoResponse("", { status: 400 });
  }

  const secret = secrets[apiKey];
  if (!secret) {
    return new ExpoResponse("", { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(timestamp).update(endpoint);
  const raw = await response.text();

  if (raw) {
    hmac.update(raw);
  }

  const hash = hmac.digest("base64");

  const headers = new Headers(Object.fromEntries(response.headers.entries()));

  headers.set("X-Endpoint", endpoint);
  headers.set("X-Timestamp", timestamp);
  headers.set("X-signature", "hmac-sha256 " + hash);

  return new ExpoResponse(raw, { ...response, headers });
}
