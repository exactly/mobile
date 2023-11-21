import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient, createActivityPoller, getWebAuthnAttestation } from "@turnkey/http";
import { encode } from "base64-arraybuffer";
import { deviceName } from "expo-device";
import React, { useCallback } from "react";
import { Platform } from "react-native";
import * as Sentry from "sentry-expo";
import { Button, Text, XStack, YStack } from "tamagui";
import { UAParser } from "ua-parser-js";
import { useBlockNumber } from "wagmi";

const rpId = __DEV__ && Platform.OS === "web" ? "localhost" : "exactly.app";

export default function Home() {
  const { data: blockNumber } = useBlockNumber();

  const create = useCallback(() => {
    const challenge = generateRandomBuffer();
    getWebAuthnAttestation({
      publicKey: {
        rp: { id: rpId, name: "exactly" },
        user: { id: challenge, name: "exactly account", displayName: "exactly account" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { requireResidentKey: true, residentKey: "required", userVerification: "required" },
        challenge,
      },
    })
      .then(async (attestation) => {
        console.log("attestation", attestation); // eslint-disable-line no-console
        if (!process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID) throw new Error("missing turnkey organization id");
        const client = turnkeyClient();
        const activityPoller = createActivityPoller({ client, requestFn: client.createSubOrganization });
        const completedActivity = await activityPoller({
          type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V4",
          timestampMs: String(Date.now()),
          organizationId: process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID,
          parameters: {
            subOrganizationName: attestation.credentialId,
            rootQuorumThreshold: 1,
            rootUsers: [
              {
                apiKeys: [],
                userName: "account",
                authenticators: [
                  {
                    authenticatorName: deviceName ?? new UAParser(navigator.userAgent).getBrowser().name ?? "unknown",
                    challenge: base64URLEncode(challenge),
                    attestation,
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
        console.log(completedActivity); // eslint-disable-line no-console
      })
      .catch(handleError);
  }, []);

  const get = useCallback(() => {
    navigator.credentials
      .get({ publicKey: { rpId, userVerification: "required", challenge: generateRandomBuffer() } })
      .then((credential) => {
        console.log("credential", credential); // eslint-disable-line no-console
      })
      .catch(handleError);
  }, []);

  return (
    <XStack flex={1} alignItems="center" space>
      <YStack flex={1} alignItems="center" space>
        <Text textAlign="center">block number: {blockNumber && String(blockNumber)}</Text>
        <Button onPress={create}>create</Button>
        <Button onPress={get}>get</Button>
      </YStack>
    </XStack>
  );
}

function base64URLEncode(buffer: ArrayBufferLike) {
  return encode(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateRandomBuffer() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array.buffer;
}

function handleError(error: unknown) {
  console.log(error); // eslint-disable-line no-console
  (Sentry.Native ?? Sentry.React).captureException(error); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}

function turnkeyClient() {
  if (!process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY || !process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY) {
    throw new Error("missing turnkey api keys");
  }
  return new TurnkeyClient(
    { baseUrl: "https://api.turnkey.com" },
    new ApiKeyStamper({
      apiPublicKey: process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY,
      apiPrivateKey: process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY,
    }),
  );
}
