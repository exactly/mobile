import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getUserInquiry } from "../../utils/kyc.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const id = "1"; // get user from auth token

  if (request.method !== "GET") {
    response.status(405).end("method not allowed");
    return;
  }

  const { workflow } = request.query as { workflow: "native" | "hosted" };

  const inquiry = await getUserInquiry({ user: id, workflow });

  if (!inquiry) {
    response.send(404).end("not found");
    return;
  }

  response.send(inquiry);
}
