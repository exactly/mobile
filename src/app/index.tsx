import Auditor from "@exactly/protocol/deployments/op-sepolia/Auditor.json";
import MarketUSDC from "@exactly/protocol/deployments/op-sepolia/MarketUSDC.e.json";
import MarketWETH from "@exactly/protocol/deployments/op-sepolia/MarketWETH.json";
import React, { useCallback } from "react";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { formatEther, getAddress, parseUnits, zeroAddress } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract, useSimulateContract, useWriteContract } from "wagmi";

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
        <Text textAlign="center">{txHash}</Text>
        <Text textAlign="center">{accountLiquidity && accountLiquidity.map((v) => formatEther(v)).join(", ")}</Text>
        <Button disabled={!connector || isConnecting} onPress={address ? disconnectAccount : connectAccount}>
          {isConnecting ? <Spinner size="small" /> : address ?? "connect"}
        </Button>
        <Button disabled={!enterWETHSimulation || isSending} onPress={enterWETH}>
          enter WETH market
        </Button>
        <Button disabled={!borrowUSDCSimulation || isSending} onPress={borrowUSDC}>
          borrow 1 USDC
        </Button>
      </YStack>
    </XStack>
  );
}
