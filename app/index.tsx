import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient, createActivityPoller, getWebAuthnAttestation } from "@turnkey/http";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import { deviceName } from "expo-device";
import React, { useCallback } from "react";
import { Platform } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { UAParser } from "ua-parser-js";
import { useBlockNumber } from "wagmi";

import useTurnkeyStore from "../hooks/useTurnkeyStore";
import base64URLEncode from "../utils/base64URLEncode";
import generateRandomBuffer from "../utils/generateRandomBuffer";
import handleError from "../utils/handleError";

if (!process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID) throw new Error("missing turnkey organization id");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY) throw new Error("missing turnkey api public key");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY) throw new Error("missing turnkey api private key");

const rpId = __DEV__ && Platform.OS === "web" ? "localhost" : "exactly.app";
const apiPublicKey = process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY;
const apiPrivateKey = process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY;
const organizationId = process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID;

export default function Home() {
  const { data: blockNumber } = useBlockNumber();
  const { connect: connectTurnkey } = useTurnkeyStore();

  const create = useCallback(() => {
    const name = `exactly, ${new Date().toISOString()}`;
    const challenge = generateRandomBuffer();
    getWebAuthnAttestation({
      publicKey: {
        rp: { id: rpId, name: "exactly" },
        user: { id: challenge, name, displayName: name },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { requireResidentKey: true, residentKey: "required", userVerification: "required" },
        challenge,
      },
    })
      .then(async (attestation) => {
        const client = new TurnkeyClient(
          { baseUrl: "https://api.turnkey.com" },
          new ApiKeyStamper({ apiPublicKey, apiPrivateKey }),
        );
        const activityPoller = createActivityPoller({ client, requestFn: client.createSubOrganization });
        const {
          result: { createSubOrganizationResultV4 },
        } = await activityPoller({
          type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V4",
          timestampMs: String(Date.now()),
          organizationId,
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
        if (!createSubOrganizationResultV4?.wallet?.addresses[0]) throw new Error("sub-org creation failed");
        connectTurnkey(
          createSubOrganizationResultV4.subOrganizationId,
          createSubOrganizationResultV4.wallet.addresses[0],
        );
      })
      .catch(handleError);
  }, [connectTurnkey]);

  const connect = useCallback(() => {
    new TurnkeyClient({ baseUrl: "https://api.turnkey.com" }, new WebauthnStamper({ rpId }))
      .getWhoami({ organizationId })
      .then(async ({ organizationId: subOrgId }) => {
        const client = new TurnkeyClient(
          { baseUrl: "https://api.turnkey.com" },
          new ApiKeyStamper({ apiPublicKey, apiPrivateKey }),
        );
        const {
          wallets: [wallet],
        } = await client.getWallets({ organizationId: subOrgId });
        if (!wallet) throw new Error("no wallet");
        const { accounts } = await client.getWalletAccounts({ organizationId: subOrgId, walletId: wallet.walletId });
        const account = accounts.find(({ curve }) => curve === "CURVE_SECP256K1");
        if (!account) throw new Error("no ethereum account");
        connectTurnkey(subOrgId, account.address);
      })
      .catch(handleError);
  }, [connectTurnkey]);

  return (
    <XStack flex={1} alignItems="center" space>
      <YStack flex={1} alignItems="center" space>
        <Text textAlign="center">block number: {blockNumber && String(blockNumber)}</Text>
        <Button onPress={create}>create</Button>
        <Button onPress={connect}>connect</Button>
      </YStack>
    </XStack>
  );
}
