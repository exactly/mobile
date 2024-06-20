import type { VercelRequest, VercelResponse } from "@vercel/node";

import auth from "../middleware/auth.js";
import cors from "../middleware/cors.js";
import { createCard } from "../utils/cryptomate.js";

export default cors(
  auth(async function handler({ method }: VercelRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "POST":
        try {
          const card = await createCard("Satoshi Nakamoto");
          return response.json(card);
        } catch (error) {
          return response.status(400).end(error instanceof Error ? error.message : error);
        }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);
