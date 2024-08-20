import domain from "@exactly/common/domain";
import { Base64URL } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setContext } from "@sentry/node";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { generateChallenge, isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie, setSignedCookie } from "hono/cookie";
import { any, literal, looseObject, object, optional } from "valibot";

import database, { credentials } from "../../database";
import authSecret from "../../utils/authSecret";
import expectedOrigin from "../../utils/expectedOrigin";
import redis from "../../utils/redis";

const app = new Hono();

app.get(
  "/",
  vValidator("query", object({ credentialId: optional(Base64URL) }), ({ success }, c) => {
    if (!success) return c.text("bad credential", 400);
  }),
  async (c) => {
    const timeout = 5 * 60_000;
    const { credentialId } = c.req.valid("query");
    const [options, sessionId] = await Promise.all([
      generateAuthenticationOptions({
        rpID: domain,
        allowCredentials: credentialId ? [{ id: credentialId }] : undefined,
        timeout,
      }),
      generateChallenge().then(isoBase64URL.fromBuffer),
    ]);
    setCookie(c, "session_id", sessionId, { domain, expires: new Date(Date.now() + timeout), httpOnly: true });
    await redis.set(sessionId, options.challenge, "PX", timeout);
    return c.json(options);
  },
);

app.post(
  "/",
  vValidator("query", object({ credentialId: Base64URL }), ({ success }, c) => {
    if (!success) return c.text("bad credential", 400);
  }),
  vValidator("cookie", object({ session_id: Base64URL }), ({ success }, c) => {
    if (!success) return c.text("bad session", 400);
  }),
  vValidator(
    "json",
    looseObject({
      id: Base64URL,
      rawId: Base64URL,
      response: looseObject({ clientDataJSON: Base64URL, authenticatorData: Base64URL, signature: Base64URL }),
      clientExtensionResults: any(),
      type: literal("public-key"),
    }),
    (result, c) => {
      if (!result.success) {
        setContext("validation", result);
        captureException(new Error("bad authentication"));
        return c.text("bad authentication", 400);
      }
    },
  ),
  async (c) => {
    const { credentialId } = c.req.valid("query");
    const { session_id: sessionId } = c.req.valid("cookie");
    const [credential, challenge] = await Promise.all([
      database.query.credentials.findFirst({ where: eq(credentials.id, credentialId) }),
      redis.get(sessionId),
    ]);
    if (!credential) return c.text("unknown credential", 400);
    if (!challenge) return c.text("no authentication", 400);

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verification = await verifyAuthenticationResponse({
        response: c.req.valid("json"),
        expectedRPID: domain,
        expectedOrigin: expectedOrigin(c.req.header("user-agent")),
        expectedChallenge: challenge,
        authenticator: {
          credentialID: credentialId,
          credentialPublicKey: credential.publicKey,
          transports: credential.transports ? (credential.transports as AuthenticatorTransportFuture[]) : undefined,
          counter: credential.counter,
        },
      });
    } catch (error) {
      captureException(error);
      return c.text(error instanceof Error ? error.message : String(error), 400);
    } finally {
      await redis.del(sessionId);
    }
    const {
      verified,
      authenticationInfo: { credentialID, newCounter },
    } = verification;
    if (!verified) return c.text("bad authentication", 400);

    const expires = new Date(Date.now() + 24 * 60 * 60_000);
    await Promise.all([
      setSignedCookie(c, "credential_id", credentialId, authSecret, { domain, expires, httpOnly: true }),
      database.update(credentials).set({ counter: newCounter }).where(eq(credentials.id, credentialID)),
    ]);

    return c.json({ expires: expires.getTime() });
  },
);

export default app;
