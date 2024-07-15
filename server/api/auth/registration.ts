import { rpId } from "@exactly/common/constants.js";
import { Base64URL } from "@exactly/common/types.js";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { cose } from "@simplewebauthn/server/helpers";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { safeParse } from "valibot";
import type { Hash } from "viem";

import database, { credentials } from "../../database/index.js";
import cors from "../../middleware/cors.js";
import decodePublicKey from "../../utils/decodePublicKey.js";
import expectedOrigin from "../../utils/expectedOrigin.js";
import handleError from "../../utils/handleError.js";

export default cors(async function handler({ method, headers, query, body }: VercelRequest, response: VercelResponse) {
  switch (method) {
    case "GET": {
      const options = await generateRegistrationOptions({
        rpID: rpId,
        rpName: "exactly",
        userName: "user", // TODO change username
        userDisplayName: "user", // TODO change display name
        attestationType: "direct",
        supportedAlgorithmIDs: [cose.COSEALG.ES256],
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
        // TODO excludeCredentials?
        timeout: 5 * 60_000,
      });
      await kv.set(
        options.user.id,
        options.challenge,
        options.timeout === undefined ? undefined : { px: options.timeout },
      );
      return response.send(options);
    }
    case "POST": {
      const { success, output: userId } = safeParse(Base64URL, query.userId);
      if (!success) return response.status(400).end("bad user");

      const challenge = await kv.get<string>(userId);
      if (!challenge) return response.status(400).end("no registration");

      const attestation = body as RegistrationResponseJSON;
      let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
      try {
        verification = await verifyRegistrationResponse({
          response: attestation,
          expectedRPID: rpId,
          expectedOrigin: expectedOrigin(headers["user-agent"]),
          expectedChallenge: challenge,
          supportedAlgorithmIDs: [cose.COSEALG.ES256],
        });
      } catch (error) {
        handleError(error);
        return response.status(400).end(error instanceof Error ? error.message : error);
      }
      const { verified, registrationInfo } = verification;
      if (!verified || !registrationInfo) return response.status(400).end("bad registration");

      const { credentialID, credentialPublicKey, credentialDeviceType, counter } = registrationInfo;
      if (credentialDeviceType !== "multiDevice") return response.status(400).end("backup eligibility required"); // TODO improve ux

      let x: Hash, y: Hash;
      try {
        ({ x, y } = decodePublicKey(credentialPublicKey));
      } catch (error) {
        return response.status(400).end(error instanceof Error ? error.message : error);
      }

      await Promise.all([
        database
          .insert(credentials)
          .values([
            { id: credentialID, publicKey: credentialPublicKey, transports: attestation.response.transports, counter },
          ]),
        kv.del(userId),
      ]);

      return response.send({ credentialId: credentialID, x, y });
    }
    default:
      return response.status(405).end("method not allowed");
  }
});
