import domain from "@exactly/common/domain";
import { exaAccountFactoryAddress } from "@exactly/common/generated/chain";
import { Base64URL } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { captureException, setContext } from "@sentry/node";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { cose, generateChallenge, isoBase64URL } from "@simplewebauthn/server/helpers";
import { Hono } from "hono";
import { setCookie, setSignedCookie } from "hono/cookie";
import { any, array, literal, looseObject, nullish, object, picklist, pipe, transform } from "valibot";
import type { Hash } from "viem";

import database, { credentials } from "../../database";
import androidOrigin from "../../utils/android/origin";
import appOrigin from "../../utils/appOrigin";
import authSecret from "../../utils/authSecret";
import decodePublicKey from "../../utils/decodePublicKey";
import deriveAddress from "../../utils/deriveAddress";
import redis from "../../utils/redis";

const app = new Hono();

app.get("/", async (c) => {
  const timeout = 5 * 60_000;
  const [options, sessionId] = await Promise.all([
    generateRegistrationOptions({
      rpID: domain,
      rpName: "exactly",
      userName: "user", // TODO change username
      userDisplayName: "user", // TODO change display name
      supportedAlgorithmIDs: [cose.COSEALG.ES256],
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      // TODO excludeCredentials?
      timeout,
    }),
    generateChallenge().then(isoBase64URL.fromBuffer),
  ]);
  setCookie(c, "session_id", sessionId, { domain, expires: new Date(Date.now() + timeout), httpOnly: true });
  await redis.set(sessionId, options.challenge, "PX", timeout);
  return c.json(options);
});

app.post(
  "/",
  vValidator("cookie", object({ session_id: Base64URL }), ({ success }, c) => {
    if (!success) return c.text("bad session", 400);
  }),
  vValidator(
    "json",
    looseObject({
      id: Base64URL,
      rawId: Base64URL,
      response: looseObject({
        clientDataJSON: Base64URL,
        attestationObject: Base64URL,
        transports: pipe(
          nullish(array(picklist(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]))),
          transform((transports) => transports ?? undefined),
        ),
      }),
      clientExtensionResults: any(),
      type: literal("public-key"),
    }),
    (result, c) => {
      if (!result.success) {
        setContext("validation", result);
        captureException(new Error("bad registration"));
        return c.text("bad registration", 400);
      }
    },
  ),
  async (c) => {
    const { session_id: sessionId } = c.req.valid("cookie");
    const challenge = await redis.get(sessionId);
    if (!challenge) return c.text("no registration", 400);

    const attestation = c.req.valid("json");
    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response: attestation,
        expectedRPID: domain,
        expectedOrigin: [appOrigin, androidOrigin],
        expectedChallenge: challenge,
        supportedAlgorithmIDs: [cose.COSEALG.ES256],
      });
    } catch (error) {
      captureException(error);
      return c.text(error instanceof Error ? error.message : String(error), 400);
    } finally {
      await redis.del(sessionId);
    }
    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) return c.text("bad registration", 400);

    const { credentialID, credentialPublicKey, credentialDeviceType, counter } = registrationInfo;
    if (credentialDeviceType !== "multiDevice") return c.text("backup eligibility required", 400); // TODO improve ux

    let x: Hash, y: Hash;
    try {
      ({ x, y } = decodePublicKey(credentialPublicKey));
    } catch (error) {
      return c.text(error instanceof Error ? error.message : String(error), 400);
    }

    const expires = new Date(Date.now() + 24 * 60 * 60_000);
    await Promise.all([
      setSignedCookie(c, "credential_id", credentialID, authSecret, { domain, expires, httpOnly: true }),
      database.insert(credentials).values([
        {
          id: credentialID,
          publicKey: credentialPublicKey,
          factory: exaAccountFactoryAddress,
          account: deriveAddress(exaAccountFactoryAddress, credentialPublicKey),
          transports: attestation.response.transports,
          counter,
        },
      ]),
    ]);

    return c.json({ credentialId: credentialID, factory: exaAccountFactoryAddress, x, y, auth: expires.getTime() });
  },
);

export default app;
