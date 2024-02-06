import type { GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { saveChallenge } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";
import rpId from "../../utils/rpId.js";

const ES256 = -7;

async function handler(request: VercelRequest, response: VercelResponse) {
  const { challengeID } = request.query as { challengeID: string };
  const registrationOptions: GenerateRegistrationOptionsOpts = {
    rpName: "exactly",
    rpID: rpId,
    userID: challengeID,
    // TODO: change username
    userName: "username",
    timeout: 60_000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "discouraged",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [ES256],
  };
  const options = await generateRegistrationOptions(registrationOptions);
  await saveChallenge({ challenge: options.challenge, challengeID });
  response.send(options);
}

export default allowCors(handler);
