import type { VercelRequest, VercelResponse } from "@vercel/node";

import processTransaction from "../../src/transaction";
import { authorizationRequest } from "../../src/types";
import { buffer } from "../../src/utils";
import { signResponse, verifySignature } from "../../src/verify";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function (request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    return response.status(405).end("method not allowed");
  }

  const buf = await buffer(request);
  const raw = buf.toString("utf8");

  if (!verifySignature(request, raw)) {
    return response.status(403).end("forbidden");
  }

  const tx = await processTransaction(authorizationRequest.parse(raw));
  return signResponse(request, response.status(200), JSON.stringify(tx));
}
