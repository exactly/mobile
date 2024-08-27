import {
  exaPluginAbi,
  exaPluginAddress,
  marketUSDCAddress,
  previewerAddress,
  usdcAddress,
} from "@exactly/common/generated/chain";
import { useMutation } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import React, { useCallback, useState } from "react";
import { ms } from "react-native-size-matters";
import { View, Spinner } from "tamagui";
import { encodeAbiParameters, encodeFunctionData, getAbiItem, keccak256, maxUint256, zeroAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import {
  upgradeableModularAccountAbi,
  useReadExaPluginPluginManifest,
  useReadIAccountLoupeGetInstalledPlugins,
  useReadPreviewerExactly,
  useSimulateMarketBorrowAtMaturity,
  useSimulateUpgradeableModularAccountUninstallPlugin,
} from "../../generated/contracts";
import { accountClient } from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Input from "../shared/Input";
import Text from "../shared/Text";

function copyHash(hash: string | undefined) {
  if (!hash) return;
  setStringAsync(hash).catch(handleError);
}

export default function ContractUtils() {
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const { address } = useAccount();

  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  const { data: installedPlugins } = useReadIAccountLoupeGetInstalledPlugins({
    address: address ?? zeroAddress,
  });
  const { data: pluginManifest } = useReadExaPluginPluginManifest({
    address: exaPluginAddress,
  });

  const marketUSDC = markets?.find((market) => market.asset === usdcAddress);
  const floatingUSDCDeposit = marketUSDC?.floatingDepositAssets ?? 0n;
  const firstMaturity = marketUSDC?.fixedPools[0]?.maturity ?? 0n;
  const borrowAssets = BigInt(borrowAmount * 10 ** (marketUSDC?.decimals ?? 6));

  const { data: borrowUSDCSimulation } = useSimulateMarketBorrowAtMaturity({
    address: marketUSDCAddress,
    args: [firstMaturity, borrowAssets, maxUint256, address ?? zeroAddress, address ?? zeroAddress],
    query: { enabled: !!address && !!floatingUSDCDeposit && floatingUSDCDeposit > 0n },
  });
  const { data: uninstallPluginSimulation } = useSimulateUpgradeableModularAccountUninstallPlugin({
    address,
    args: [installedPlugins?.[0] ?? zeroAddress, "0x", "0x"],
    query: { enabled: !!address && !!installedPlugins },
  });

  const { writeContract: borrow, data: borrowHash, isPending: isBorrowing, error: borrowError } = useWriteContract();

  const borrowUSDC = useCallback(() => {
    if (!borrowUSDCSimulation) throw new Error("no borrow simulation");
    borrow(borrowUSDCSimulation.request);
  }, [borrow, borrowUSDCSimulation]);

  const {
    data: updatePluginHash,
    mutateAsync: upgradePlugin,
    isPending,
  } = useMutation({
    mutationFn: async () => {
      if (!accountClient) throw new Error("no account client");
      if (!address) throw new Error("no account address");
      if (!installedPlugins?.[0]) throw new Error("no installed plugin");
      if (!uninstallPluginSimulation) throw new Error("no uninstall plugin simulation");
      if (!pluginManifest) throw new Error("invalid manifest");
      const hash = await accountClient.sendUserOperation({
        uo: [
          { target: address, value: 0n, data: encodeFunctionData(uninstallPluginSimulation.request) },
          {
            target: address,
            value: 0n,
            data: encodeFunctionData({
              abi: upgradeableModularAccountAbi,
              functionName: "installPlugin",
              args: [
                exaPluginAddress,
                keccak256(
                  encodeAbiParameters(getAbiItem({ abi: exaPluginAbi, name: "pluginManifest" }).outputs, [
                    pluginManifest,
                  ]),
                ),
                "0x",
                [],
              ],
            }),
          },
        ],
      });
      return accountClient.waitForUserOperationTransaction(hash);
    },
  });

  return (
    <View gap="$s4">
      <Text fontSize={ms(16)} subHeadline fontWeight="bold">
        Exactly
      </Text>
      {(isBorrowing || isPending) && <Spinner color="$interactiveBaseBrandDefault" />}
      {borrowError && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {borrowError.message}
        </Text>
      )}
      {updatePluginHash && (
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {updatePluginHash}
          </Text>
        </View>
      )}

      <View flexDirection="row" gap="$s4">
        <Button
          contained
          onPress={() => {
            upgradePlugin().catch(handleError);
          }}
          padding={ms(10)}
          disabled={!uninstallPluginSimulation || exaPluginAddress === installedPlugins?.[0]}
          flex={1}
        >
          Upgrade Plugin
        </Button>
        {updatePluginHash && (
          <Button
            outlined
            borderRadius="$r2"
            onPress={() => {
              copyHash(updatePluginHash);
            }}
            padding={ms(10)}
            flex={1}
          >
            Copy
          </Button>
        )}
      </View>
      <View gap="$s4">
        <Text fontSize={ms(16)}>Borrow</Text>
        <Input
          inputMode="numeric"
          value={borrowAmount.toString()}
          onChange={(event) => {
            setBorrowAmount(Number(event.nativeEvent.text));
          }}
        />
        {borrowHash && (
          <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
            <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
              {borrowHash}
            </Text>
          </View>
        )}
        <View flexDirection="row" gap="$s4">
          <Button
            contained
            onPress={borrowUSDC}
            disabled={floatingUSDCDeposit === 0n || !borrowUSDCSimulation}
            padding={ms(10)}
            flex={1}
          >
            Borrow USDC
          </Button>
          {borrowHash && (
            <Button
              outlined
              borderRadius="$r2"
              onPress={() => {
                copyHash(borrowHash);
              }}
              padding={ms(10)}
              flex={1}
            >
              Copy
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
