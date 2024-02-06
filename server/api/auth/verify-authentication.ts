import {
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
  type VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

import { base64URLEncode, getChallenge, getCredentialsByID, ORIGIN } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";
import rpId from "../../utils/rpId.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const body = request.body as AuthenticationResponseJSON;
  const { challengeID } = request.query as { challengeID: string };
  const credentials = await getCredentialsByID(body.id);
  const challenge = await getChallenge(challengeID);

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
      expectedOrigin: ORIGIN,
      expectedRPID: rpId,
      authenticator: databaseAuthenticator,
      requireUserVerification: false,
    };
    verification = await verifyAuthenticationResponse(options);
  } catch (error) {
    const _error = error as Error;
    response.status(400).send({ error: _error.message });
    return;
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    databaseAuthenticator.counter = authenticationInfo.newCounter;
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not set");
  }
  const token = jwt.sign({ credentialID: base64URLEncode(authenticationInfo.credentialID) }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
  response.send({ verified, token });
}

export default allowCors(handler);
