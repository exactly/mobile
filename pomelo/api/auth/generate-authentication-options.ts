import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { saveChallenge } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";
import rpId from "../../utils/rpId.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const { challengeID } = request.query as { challengeID: string };
  const options = await generateAuthenticationOptions({
    timeout: 60_000,
    userVerification: "preferred",
    rpID: rpId,
  });
  await saveChallenge({ challenge: options.challenge, challengeID });
  response.send(options);
}

export default allowCors(handler);
