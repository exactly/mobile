import {
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
  type VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import type { AuthenticatorDevice, RegistrationResponseJSON } from "@simplewebauthn/types";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { rpId } from "../../../utils/constants.js";
import { getChallenge, getCredentials, saveCredentials } from "../../utils/auth.js";
import allowCors from "../../utils/cors.js";

async function handler(request: VercelRequest, response: VercelResponse) {
  const body = request.body as RegistrationResponseJSON;

  const { userID } = request.query as { userID: string };

  const credentials = await getCredentials(userID);

  const challenge = await getChallenge(userID);

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
      expectedOrigin: "http://localhost:8081",
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

    const existingDevice = credentials.find((credential) => isoUint8Array.areEqual(credential.id, credentialID));

    if (!existingDevice) {
      /**
       * Add the returned device to the user's list of devices
       */
      const newDevice: AuthenticatorDevice = {
        credentialPublicKey,
        credentialID,
        counter,
        transports: body.response.transports,
      };
      await saveCredentials({ ...newDevice, userID });
    }
  }

  response.send({ verified });
}

export default allowCors(handler);
