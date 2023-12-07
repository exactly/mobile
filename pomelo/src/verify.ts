import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const secrets = {
  [process.env.POMELO_API_KEY as string]: process.env.POMELO_API_SECRET,
} as const;

function valid(header: string | string[] | undefined): header is string {
  return typeof header === "string";
}

export function verifySignature(request: VercelRequest, body: string) {
  const endpoint = request.headers["x-endpoint"];
  const timestamp = request.headers["x-timestamp"];
  let signature = request.headers["x-signature"];
  const apiKey = request.headers["x-api-key"];

  if (!valid(endpoint) || !valid(timestamp) || !valid(apiKey) || Array.isArray(apiKey) || !valid(signature)) {
    return false;
  }

  const secret: string | undefined = secrets[apiKey];
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
    .update(body);

  const hash = hmac.digest("base64");
  const hashBytes = Buffer.from(hash, "base64");

  const signatureBytes = Buffer.from(signature, "base64");
  return crypto.timingSafeEqual(hashBytes, signatureBytes);
}

export function signResponse(request: VercelRequest, response: VercelResponse, text: string | undefined) {
  const endpoint = request.headers["x-endpoint"];
  const apiKey = request.headers["x-api-key"];
  if (!valid(endpoint) || !valid(apiKey)) {
    return response.status(400).end("bad request");
  }

  const secret = secrets[apiKey];
  if (!secret) {
    return response.status(500).end("internal server error");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(timestamp).update(endpoint);
  if (text) {
    hmac.update(text);
  }

  const hash = hmac.digest("base64");

  response.setHeader("X-Endpoint", endpoint);
  response.setHeader("X-Timestamp", timestamp);
  response.setHeader("X-signature", "hmac-sha256 " + hash);

  return response.end(text);
}
