import type { VercelRequest, VercelResponse } from "@vercel/node";

import { authenticated } from "../utils/auth.js";
import allowCors from "../utils/cors.js";
import type { CreateUserForm } from "../utils/types.js";
import { createUser, getUserByCredentialID } from "../utils/user.js";

async function handler(request: VercelRequest, response: VercelResponse, credentialID: string) {
  if (request.method === "POST") {
    try {
      const body = request.body as CreateUserForm; // TODO: validate request body
      const user = await createUser({
        ...body,
        operation_country: "MEX", // TODO: only for sandbox. For prod will be "PER"
        email: `${credentialID}@exactly.account`,
      });
      response.status(200).json(user);
    } catch (error) {
      response.status(400).end(error instanceof Error ? error.message : "Unknown error");
    }
  } else if (request.method === "GET") {
    const user = await getUserByCredentialID(credentialID);
    if (user) {
      response.status(200).json(user);
    } else {
      response.status(404).end("User not found");
    }
  }
}

export default allowCors(authenticated(handler));
