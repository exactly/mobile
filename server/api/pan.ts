import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";

import database, { cards } from "../database/index.js";
import auth from "../middleware/auth.js";
import cors from "../middleware/cors.js";
import { getPAN } from "../utils/cryptomate.js";

export default cors(
  auth(async function pan({ method }: VercelRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "GET": {
        const card = await database.query.cards.findFirst({
          columns: { id: true },
          where: eq(cards.credentialId, credentialId),
        });
        if (!card) return response.status(404).end("card not found");
        return response.json(await getPAN(card.id)).end();
      }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);
