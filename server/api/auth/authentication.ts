import { rpId } from "@exactly/common/constants.js";
import { Base64URL } from "@exactly/common/types.js";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { safeParse } from "valibot";

import database, { credentials } from "../../database/index.js";
import cors from "../../middleware/cors.js";
import expectedOrigin from "../../utils/expectedOrigin.js";
import handleError from "../../utils/handleError.js";
import jwtSecret from "../../utils/jwtSecret.js";

export default cors(async function handler({ method, headers, query, body }: VercelRequest, response: VercelResponse) {
  switch (method) {
    case "GET": {
      const { success, output: credentialId } = safeParse(Base64URL, query.credentialId);
      if (!success) return response.status(400).end("bad credential");
      const options = await generateAuthenticationOptions({ rpID: rpId, allowCredentials: [{ id: credentialId }] });
      await kv.set(
        credentialId,
        options.challenge,
        options.timeout === undefined ? undefined : { px: options.timeout },
      );
      return response.send(options);
    }
    case "POST": {
      const { success, output: credentialId } = safeParse(Base64URL, query.credentialId);
      if (!success) return response.status(400).end("bad credential");

      const [credential, challenge] = await Promise.all([
        database.query.credentials.findFirst({ where: eq(credentials.id, credentialId) }),
        kv.get<string>(credentialId),
      ]);
      if (!credential) return response.status(400).end("unknown credential");
      if (!challenge) return response.status(400).end("no authentication");

      const assertion = body as AuthenticationResponseJSON;
      let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
      try {
        verification = await verifyAuthenticationResponse({
          response: assertion,
          expectedRPID: rpId,
          expectedOrigin: expectedOrigin(headers["user-agent"]),
          expectedChallenge: challenge,
          authenticator: {
            credentialID: credentialId,
            credentialPublicKey: credential.publicKey,
            transports: credential.transports ? (credential.transports as AuthenticatorTransportFuture[]) : undefined,
            counter: credential.counter,
          },
        });
      } catch (error) {
        handleError(error);
        return response.status(400).end(error instanceof Error ? error.message : error);
      }
      const {
        verified,
        authenticationInfo: { credentialID, newCounter },
      } = verification;
      if (!verified) return response.status(400).end("bad authentication");

      const [token] = await Promise.all([
        new SignJWT({ credentialId })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(jwtSecret),
        database.update(credentials).set({ counter: newCounter }).where(eq(credentials.id, credentialID)),
        kv.del(credentialId),
      ]);

      return response.send({ token });
    }
    default:
      return response.status(405).end("method not allowed");
  }
});
