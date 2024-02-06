import {
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
  type VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/typescript-types";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getChallenge, ORIGIN, saveCredentials } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";
import rpId from "../../utils/rpId.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const body = request.body as RegistrationResponseJSON;
  const { challengeID } = request.query as { challengeID: string };

  const challenge = await getChallenge(challengeID);
  if (!challenge) {
    response.send({ verified: false });
    return;
  }

  const { value: expectedChallenge } = challenge;

  let verification: VerifiedRegistrationResponse;
  try {
    const options: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: rpId,
      requireUserVerification: false,
    };
    verification = await verifyRegistrationResponse(options);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);
    response.status(400).send({ error: _error.message });
    return;
  }
  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    await saveCredentials({
      credentialPublicKey,
      credentialID,
      counter,
      transports: body.response.transports,
    });
  }
  response.send({ verified });
}

export default allowCors(handler);
