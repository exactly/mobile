import { rpId } from "@exactly/common/constants.ts";
import { Base64URL } from "@exactly/common/types.ts";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { safeParse } from "valibot";

import database, { credential } from "../../database/index.ts";
import takeUniqueOrThrow from "../../database/takeUniqueOrThrow.ts";
import cors, { ORIGIN } from "../../middleware/cors.ts";
import handleError from "../../utils/handleError.ts";
import jwtSecret from "../../utils/jwtSecret.ts";

export default cors(async function handler({ method, query, body }: VercelRequest, response: VercelResponse) {
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

      const challenge = await kv.get<string>(credentialId);
      if (!challenge) return response.status(400).end("no authentication");

      const assertion = body as AuthenticationResponseJSON;
      let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
      try {
        const { publicKey, transports, counter } = await database
          .select()
          .from(credential)
          .where(eq(credential.id, credentialId))
          .then(takeUniqueOrThrow);
        verification = await verifyAuthenticationResponse({
          response: assertion,
          expectedRPID: rpId,
          expectedOrigin: ORIGIN,
          expectedChallenge: challenge,
          authenticator: {
            credentialID: credentialId,
            credentialPublicKey: publicKey,
            transports: transports ? (transports as AuthenticatorTransportFuture[]) : undefined,
            counter,
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

      await kv.del(credentialId);

      await database.update(credential).set({ counter: newCounter }).where(eq(credential.id, credentialID));
      return response.send({
        token: await new SignJWT({ credentialId })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(jwtSecret),
      });
    }
    default:
      return response.status(405).end("method not allowed");
  }
});
