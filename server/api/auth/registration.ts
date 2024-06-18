import { rpId } from "@exactly/common/constants.ts";
import { Base64URL } from "@exactly/common/types.ts";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { cose, decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { safeParse } from "valibot";
import { bytesToHex } from "viem";

import database, { credential } from "../../database/index.ts";
import cors, { ORIGIN } from "../../middleware/cors.ts";
import handleError from "../../utils/handleError.ts";

export default cors(async function handler({ method, query, body }: VercelRequest, response: VercelResponse) {
  switch (method) {
    case "GET": {
      const options = await generateRegistrationOptions({
        rpID: rpId,
        rpName: "exactly",
        userName: "username", // TODO change username
        attestationType: "direct",
        supportedAlgorithmIDs: [cose.COSEALG.ES256],
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
        // TODO excludeCredentials?
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
          expectedOrigin: ORIGIN,
          expectedChallenge: challenge,
          supportedAlgorithmIDs: [cose.COSEALG.ES256],
        });
      } catch (error) {
        handleError(error);
        return response.status(400).end(error instanceof Error ? error.message : error);
      }
      const { verified, registrationInfo } = verification;
      if (!verified || !registrationInfo) return response.status(400).end("bad registration");

      await kv.del(userId);

      const { credentialID, credentialPublicKey, counter } = registrationInfo;
      const publicKey = decodeCredentialPublicKey(credentialPublicKey);
      if (!cose.isCOSEPublicKeyEC2(publicKey)) return response.status(400).end("bad public key");

      const x = publicKey.get(cose.COSEKEYS.x);
      const y = publicKey.get(cose.COSEKEYS.y);
      if (!x || !y) return response.status(400).end("bad public key");

      await database
        .insert(credential)
        .values([
          { id: credentialID, publicKey: credentialPublicKey, transports: attestation.response.transports, counter },
        ]);

      return response.send({ credentialId: credentialID, x: bytesToHex(x), y: bytesToHex(y) });
    }
    default:
      return response.status(405).end("method not allowed");
  }
});
