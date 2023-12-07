import processTransaction from "../../pomelo/transaction";
import { signResponse, verifySignature } from "../../src/verify";

export const runtime = "edge";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(request, rawBody)) {
    return new Response(undefined, { status: 403 });
  }

  const response = processTransaction(authorizationRequest.parse(rawBody));

  return signResponse(request, new Response(JSON.stringify(response), { status: 200 }));
}
