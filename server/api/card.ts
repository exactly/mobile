import type { VercelRequest, VercelResponse } from "@vercel/node";

import { authenticated } from "../utils/auth.js";
import { createCard, getCardsByUserID } from "../utils/card.js";
import allowCors from "../utils/cors.js";
import { getUserByCredentialID } from "../utils/user.js";

async function handler(request: VercelRequest, response: VercelResponse, credentialID: string) {
  const user = await getUserByCredentialID(credentialID);
  if (!user) {
    response.status(404).end("User not found");
    return;
  }
  if (request.method === "POST") {
    try {
      const card = await createCard({
        user_id: user.id,
        card_type: "VIRTUAL",
        affinity_group_id: "afg-2VfIFzzjDX9eRD2VVgmKnB6YmWm", // TODO use env. note: we'll probably use the same affinity group for all cards
      });
      response.status(200).json(card);
    } catch (error) {
      response.status(400).end(error instanceof Error ? error.message : "There was an error");
    }
  } else if (request.method === "GET") {
    const cards = await getCardsByUserID(user.id);
    response.status(200).json(cards);
  }
}
export default allowCors(authenticated(handler));
