import Auditor from "@exactly/protocol/deployments/op-sepolia/Auditor.json";
import MarketUSDC from "@exactly/protocol/deployments/op-sepolia/MarketUSDC.e.json";
import MarketWETH from "@exactly/protocol/deployments/op-sepolia/MarketWETH.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback } from "react";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { bytesToHex, formatEther, getAddress, parseUnits, zeroAddress } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import base64URLDecode from "../utils/base64URLDecode";
import { rpId } from "../utils/constants";
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
  const { data: enterWETHSimulation } = useSimulateContract({
    abi: Auditor.abi,
    address: getAddress(Auditor.address),
    functionName: "enterMarket",
    args: [MarketWETH.address],
    query: { enabled: !!address },
  });
  const { data: borrowUSDCSimulation } = useSimulateContract({
    abi: MarketUSDC.abi,
    address: getAddress(MarketUSDC.address),
    functionName: "borrow",
    args: [parseUnits("1", 6), address, address],
    query: { enabled: !!address },
  });
  const { data: accountLiquidity } = useReadContract({
    abi: [
      {
        name: "accountLiquidity",
        type: "function",
        stateMutability: "view",
        inputs: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "contract Market", name: "marketToSimulate", type: "address" },
          { internalType: "uint256", name: "withdrawAmount", type: "uint256" },
        ],
        outputs: [
          { internalType: "uint256", name: "sumCollateral", type: "uint256" },
          { internalType: "uint256", name: "sumDebtPlusEffects", type: "uint256" },
        ],
      },
    ],
    address: getAddress(Auditor.address),
    functionName: "accountLiquidity",
    args: [address ?? zeroAddress, zeroAddress, 0n],
    query: { enabled: !!address },
  });
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isSuccess, isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: txHash });

  const createCredential = useCallback(() => {
    const name = `exactly, ${new Date().toISOString()}`;
    const challenge = generateRandomBuffer();
    navigator.credentials
      .create({
        publicKey: {
          rp: { id: rpId, name: "exactly" },
          user: { id: challenge, name, displayName: name },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { requireResidentKey: true, residentKey: "required", userVerification: "required" },
          challenge,
        },
      })
      .then(async (credential) => {
        if (!credential) throw new Error("no credential");
        const response = (credential as PublicKeyCredential).response as AuthenticatorAttestationResponse;
        const publicKey = response.getPublicKey();
        if (!publicKey) throw new Error("no public key");
        const cryptoKey = await crypto.subtle.importKey(
          "spki",
          publicKey,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          [],
        );
        const jwt = await crypto.subtle.exportKey("jwk", cryptoKey);
        if (!jwt.x || !jwt.y) throw new Error("no x or y");
        const x = bytesToHex(new Uint8Array(base64URLDecode(jwt.x)));
        const y = bytesToHex(new Uint8Array(base64URLDecode(jwt.y)));
        await AsyncStorage.setItem("account.store", JSON.stringify({ credentialId: credential.id, x, y }));
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
        <Button onPress={createCredential}>create account</Button>
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
