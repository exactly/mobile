import { type ExpoRequest, ExpoResponse } from "expo-router/server";

import processTransaction from "../../pomelo/transaction";
import { authorizationRequest } from "../../pomelo/types";
import { verifySignature, signResponse } from "../../pomelo/verify";

export const runtime = "nodejs";

export async function POST(request: ExpoRequest) {
  const rawBody = await request.text();

  if (!verifySignature(request, rawBody)) {
    return ExpoResponse.json("", { status: 403 });
  }

  const response = processTransaction(authorizationRequest.parse(rawBody));

  return signResponse(request, ExpoResponse.json(response));
}
