import { CreateCardParameters } from "@exactly/common/types.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { parse } from "valibot";

import database, { cards, credentials } from "../database/index.js";
import auth from "../middleware/auth.js";
import cors from "../middleware/cors.js";
import { createCard } from "../utils/cryptomate.js";

export default cors(
  auth(async function handler({ method, body }: VercelRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "GET":
        return response
          .json(
            await database.query.cards.findMany({
              columns: { lastFour: true },
              where: eq(cards.credentialId, credentialId),
            }),
          )
          .end();
      case "POST":
        try {
          const credential = await database.query.credentials.findFirst({
            columns: { kyc: true },
            where: eq(credentials.id, credentialId),
          });
          if (!credential) return response.status(404).end("credential not found");
          if (!credential.kyc) return response.status(403).end("kyc required");
          const card = await createCard(parse(CreateCardParameters, body));
          await database.insert(cards).values([{ id: card.id, lastFour: card.last4, credentialId }]);
          return response.json(card);
        } catch (error) {
          return response.status(500).end(error instanceof Error ? error.message : error);
        }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);
