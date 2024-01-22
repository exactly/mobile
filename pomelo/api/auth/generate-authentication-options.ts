import type { GenerateAuthenticationOptionsOpts } from "@simplewebauthn/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rpId } from "../../../utils/constants.js";
import { getCredentials, saveChallenge } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const { userID } = request.query as { userID: string };
  const credentials = await getCredentials(userID);
  const options_: GenerateAuthenticationOptionsOpts = {
    timeout: 60_000,
    allowCredentials: credentials.map((credential) => ({
      ...credential,
      type: "public-key",
    })),
    userVerification: "preferred",
    rpID: rpId,
  };
  const options = await generateAuthenticationOptions(options_);
  await saveChallenge({ challenge: options.challenge, userID });
  response.send(options);
}

export default allowCors(handler);
