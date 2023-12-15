import type { VercelRequest, VercelResponse } from "@vercel/node";

import buffer from "../../utils/buffer.js";
import processTransaction from "../../utils/transaction.js";
import { authorizationRequest } from "../../utils/types.js";
import { signResponse, verifySignature } from "../../utils/verify.js";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function authorizations(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    return response.status(405).end("method not allowed");
  }

  const buf = await buffer(request);
  const raw = buf.toString("utf8");

  if (!verifySignature(request, raw)) {
    return response.status(403).end("forbidden");
  }

  const parsed = authorizationRequest.safeParse(JSON.parse(raw));

  if (parsed.success) {
    const tx = await processTransaction(parsed.data);
    return signResponse(request, response.status(200), JSON.stringify(tx));
  } else {
    return response.status(400).end("bad request");
  }
}
