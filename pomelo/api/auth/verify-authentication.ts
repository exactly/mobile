import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
  type VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/typescript-types";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rpId } from "../../../utils/constants.js";
import { getChallenge, getCredentials, origin } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const body = request.body as AuthenticationResponseJSON;
  const { userID } = request.query as { userID: string };
  const credentials = await getCredentials(userID);
  const challenge = await getChallenge(userID);

  if (!challenge) {
    response.send({ verified: false });
    return;
  }

  const { value: expectedChallenge } = challenge;
  let databaseAuthenticator;
  const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId);

  for (const credential of credentials) {
    if (isoUint8Array.areEqual(credential.id, bodyCredIDBuffer)) {
      databaseAuthenticator = credential;
      break;
    }
  }

  if (!databaseAuthenticator) {
    response.status(400).send({
      error: "Authenticator is not registered with this site",
    });
    return;
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    const options: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      authenticator: databaseAuthenticator,
      requireUserVerification: false,
    };
    verification = await verifyAuthenticationResponse(options);
  } catch (error) {
    const _error = error as Error;
    console.error(_error);
    response.status(400).send({ error: _error.message });
    return;
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    databaseAuthenticator.counter = authenticationInfo.newCounter;
  }
  response.send({ verified });
}

export default allowCors(handler);
