import type { VercelRequest, VercelResponse } from "@vercel/node";

import auth from "../middleware/auth.js";
import cors from "../middleware/cors.js";
import type { CreateUserForm } from "../utils/types.js";
import { createUser, getUserByCredentialID } from "../utils/user.js";

export default cors(
  auth(async function handler({ method, body }: VercelRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "GET": {
        const user = await getUserByCredentialID(credentialId);
        if (!user) return response.status(404).end("User not found");
        return response.json(user);
      }
      case "POST":
        try {
          const user = await createUser({
            ...(body as CreateUserForm), // TODO validate request body
            operation_country: "MEX", // TODO only for sandbox. For prod will be "PER"
            email: `${credentialId}@exactly.account`,
          });
          return response.json(user);
        } catch (error) {
          return response.status(400).end(error instanceof Error ? error.message : error);
        }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);
