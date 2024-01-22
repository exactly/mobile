import type { GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rpId } from "../../../utils/constants.js";
import { getCredentials, saveChallenge } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const { userID } = request.query as { userID: string };
  const credentials = await getCredentials(userID);
  const registrationOptions: GenerateRegistrationOptionsOpts = {
    rpName: "exactly",
    rpID: rpId,
    userID,
    // TODO: change username
    userName: "username",
    timeout: 60_000,
    attestationType: "none",
    /**
     * Passing in a user's list of already-registered authenticator IDs here prevents users from
     * registering the same device multiple times. The authenticator will simply throw an error in
     * the browser if it's asked to perform registration when one of these ID's already resides
     * on it.
     */
    excludeCredentials: credentials.map((credential) => ({
      ...credential,
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "discouraged",
      userVerification: "preferred",
    },
    /**
     * Support the two most common algorithms: ES256, and RS256
     * TODO: check if this are the correct values
     */
    supportedAlgorithmIDs: [-7, -257],
  };

  const options = await generateRegistrationOptions(registrationOptions);
  await saveChallenge({ challenge: options.challenge, userID });
  response.send(options);
}

export default allowCors(handler);
