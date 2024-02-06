import { startRegistration } from "@simplewebauthn/browser";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient, createActivityPoller } from "@turnkey/http";
import { deviceName } from "expo-device";
import { UAParser } from "ua-parser-js";

import base64URLEncode from "./base64URLEncode";
import { rpId, turnkeyAPIPrivateKey, turnkeyAPIPublicKey, turnkeyOrganizationId } from "./constants";
import generateRandomBuffer from "./generateRandomBuffer";
import handleError from "./handleError";
import { registrationOptions, verifyRegistration } from "./server/client";
import uppercase from "./uppercase";

export default async function createAccount() {
  const challengeID = base64URLEncode(generateRandomBuffer());
  const { challenge } = await registrationOptions(challengeID);
  const name = `exactly, ${new Date().toISOString()}`;
  const attestation = await startRegistration({
    rp: { id: rpId, name: "exactly" },
    user: { id: challenge, name, displayName: name },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: { requireResidentKey: true, residentKey: "required", userVerification: "required" },
    challenge,
  });
  const client = new TurnkeyClient(
    { baseUrl: "https://api.turnkey.com" },
    new ApiKeyStamper({ apiPublicKey: turnkeyAPIPublicKey, apiPrivateKey: turnkeyAPIPrivateKey }),
  );
  const activityPoller = createActivityPoller({ client, requestFn: client.createSubOrganization });
  try {
    const {
      result: { createSubOrganizationResultV4 },
    } = await activityPoller({
      type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V4",
      timestampMs: String(Date.now()),
      organizationId: turnkeyOrganizationId,
      parameters: {
        subOrganizationName: attestation.id,
        rootQuorumThreshold: 1,
        rootUsers: [
          {
            apiKeys: [],
            userName: "account",
            authenticators: [
              {
                authenticatorName: deviceName ?? new UAParser(navigator.userAgent).getBrowser().name ?? "unknown",
                challenge,
                attestation: {
                  credentialId: attestation.id,
                  attestationObject: attestation.response.attestationObject,
                  clientDataJson: attestation.response.clientDataJSON,
                  transports:
                    attestation.response.transports?.map(
                      (t) =>
                        `AUTHENTICATOR_TRANSPORT_${uppercase(t === "smart-card" || t === "cable" ? "usb" : t)}` as const,
                    ) || [],
                },
              },
            ],
          },
        ],
        wallet: {
          walletName: "default",
          accounts: [
            {
              curve: "CURVE_SECP256K1",
              addressFormat: "ADDRESS_FORMAT_ETHEREUM",
              pathFormat: "PATH_FORMAT_BIP32",
              path: "m/44'/60'/0'/0/0",
            },
          ],
        },
      },
    });
    if (!createSubOrganizationResultV4?.wallet?.addresses[0]) throw new Error("sub-org creation failed");

    const verifyRegistrationResponse = await verifyRegistration({ challengeID, attestation });
    const { verified } = verifyRegistrationResponse;

    alert(verified ? "Account created" : "Account creation failed");
  } catch (error) {
    handleError(error);
  }
}
