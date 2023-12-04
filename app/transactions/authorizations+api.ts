import { type ExpoRequest, ExpoResponse } from "expo-router/server";

import processTransaction from "../../pomelo/transaction";
import type { AuthorizationRequest } from "../../pomelo/types";
import { verifySignature, signResponse } from "../../pomelo/verify";

export const runtime = "nodejs";

export async function POST(request: ExpoRequest) {
  const rawBody = await request.text();

  if (!verifySignature(request, rawBody)) {
    return ExpoResponse.json("", { status: 403 });
  }

  const response = processTransaction(JSON.parse(rawBody) as AuthorizationRequest);

  return signResponse(request, ExpoResponse.json(response));
}
