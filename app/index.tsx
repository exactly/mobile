import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient, createActivityPoller, getWebAuthnAttestation } from "@turnkey/http";
import { deviceName } from "expo-device";
import React, { useCallback } from "react";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { UAParser } from "ua-parser-js";
import { formatEther, parseUnits, zeroAddress } from "viem";
import { useAccount, useConnect, useDisconnect, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import {
  marketWethAddress,
  useReadAuditorAccountLiquidity,
  useSimulateAuditorEnterMarket,
  useSimulateMarketUsdcBorrow,
} from "../common/wagmi";
import base64URLEncode from "../utils/base64URLEncode";
import { rpId, turnkeyAPIPrivateKey, turnkeyAPIPublicKey, turnkeyOrganizationId } from "../utils/constants";
import generateRandomBuffer from "../utils/generateRandomBuffer";
import handleError from "../utils/handleError";

export default function Home() {
  const {
    connect,
    isPending: isConnecting,
    connectors: [connector],
  } = useConnect();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: enterWETHSimulation } = useSimulateAuditorEnterMarket({
    args: [marketWethAddress],
    query: { enabled: !!address },
  });
  const { data: borrowUSDCSimulation } = useSimulateMarketUsdcBorrow({
    args: address && [parseUnits("1", 6), address, address],
    query: { enabled: !!address },
  });
  const { data: accountLiquidity } = useReadAuditorAccountLiquidity({
    args: address && [address, zeroAddress, 0n],
    query: { enabled: !!address },
  });
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isSuccess, isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash });

  const createAccount = useCallback(() => {
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
          new ApiKeyStamper({ apiPublicKey: turnkeyAPIPublicKey, apiPrivateKey: turnkeyAPIPrivateKey }),
        );
        const activityPoller = createActivityPoller({ client, requestFn: client.createSubOrganization });
        const {
          result: { createSubOrganizationResultV4 },
        } = await activityPoller({
          type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V4",
          timestampMs: String(Date.now()),
          organizationId: turnkeyOrganizationId,
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
      })
      .catch(handleError);
  }, []);

  const connectAccount = useCallback(() => {
    if (!connector) throw new Error("no connector");
    connect({ connector });
  }, [connect, connector]);

  const disconnectAccount = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const enterWETH = useCallback(() => {
    if (!enterWETHSimulation) throw new Error("no simulation");
    writeContract(enterWETHSimulation.request);
  }, [enterWETHSimulation, writeContract]);

  const borrowUSDC = useCallback(() => {
    if (!borrowUSDCSimulation) throw new Error("no simulation");
    writeContract(borrowUSDCSimulation.request);
  }, [borrowUSDCSimulation, writeContract]);

  return (
    <XStack flex={1} alignItems="center" space>
      <YStack flex={1} alignItems="center" space>
        <Text textAlign="center">{txHash && `${txHash} ${isSuccess ? "✅" : ""}`}</Text>
        <Text textAlign="center">{accountLiquidity && accountLiquidity.map((v) => formatEther(v)).join(", ")}</Text>
        <Button onPress={createAccount}>create account</Button>
        <Button disabled={!connector || isConnecting} onPress={address ? disconnectAccount : connectAccount}>
          {isConnecting ? <Spinner size="small" /> : address ?? "connect"}
        </Button>
        <Button disabled={!enterWETHSimulation || isSending || isWaiting} onPress={enterWETH}>
          enter WETH market
        </Button>
        <Button disabled={!borrowUSDCSimulation || isSending || isWaiting} onPress={borrowUSDC}>
          borrow 1 USDC
        </Button>
      </YStack>
    </XStack>
  );
}
