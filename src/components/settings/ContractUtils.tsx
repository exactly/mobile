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
import { Spinner, View } from "tamagui";
import { encodeAbiParameters, encodeFunctionData, getAbiItem, keccak256, maxUint256, zeroAddress } from "viem";
import { optimism } from "viem/chains";
import { useAccount, useWriteContract } from "wagmi";

import {
  upgradeableModularAccountAbi,
  useReadExaPluginPluginManifest,
  useReadPreviewerExactly,
  useReadUpgradeableModularAccountGetInstalledPlugins,
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
  const { address, chainId } = useAccount();

  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
    args: [address ?? zeroAddress],
  });
  const { data: installedPlugins } = useReadUpgradeableModularAccountGetInstalledPlugins({
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

  const { data: borrowHash, isPending: isBorrowing, writeContract: borrow } = useWriteContract();

  const borrowUSDC = useCallback(() => {
    if (!borrowUSDCSimulation) throw new Error("no borrow simulation");
    borrow(borrowUSDCSimulation.request);
  }, [borrow, borrowUSDCSimulation]);

  const {
    data: updatePluginHash,
    isPending: isUpdating,
    mutateAsync: updatePlugin,
  } = useMutation({
    mutationFn: async () => {
      if (!accountClient) throw new Error("no account client");
      if (!address) throw new Error("no account address");
      if (!installedPlugins?.[0]) throw new Error("no installed plugin");
      if (!uninstallPluginSimulation) throw new Error("no uninstall plugin simulation");
      if (!pluginManifest) throw new Error("invalid manifest");
      const hash = await accountClient.sendUserOperation({
        uo: [
          { data: encodeFunctionData(uninstallPluginSimulation.request), target: address, value: 0n },
          {
            data: encodeFunctionData({
              abi: upgradeableModularAccountAbi,
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
              functionName: "installPlugin",
            }),
            target: address,
            value: 0n,
          },
        ],
      });
      return accountClient.waitForUserOperationTransaction(hash);
    },
  });

  return (
    <View gap="$s4">
      <Text fontSize={ms(16)} fontWeight="bold" subHeadline>
        Exactly
      </Text>
      {(isBorrowing || isUpdating) && <Spinner color="$interactiveBaseBrandDefault" />}
      {updatePluginHash && (
        <View borderColor="$borderNeutralSoft" borderRadius="$r4" borderWidth={2} padding={ms(10)}>
          <Text fontFamily="$mono" fontSize={ms(14)} fontWeight="bold" textAlign="center" width="100%">
            {updatePluginHash}
          </Text>
        </View>
      )}
      <View flexDirection="row" gap="$s4">
        <Button
          contained
          disabled={!uninstallPluginSimulation || exaPluginAddress === installedPlugins?.[0]}
          flex={1}
          onPress={() => {
            updatePlugin().catch(handleError);
          }}
          padding={ms(10)}
        >
          Upgrade Plugin
        </Button>
        {updatePluginHash && (
          <Button
            borderRadius="$r2"
            flex={1}
            onPress={() => {
              copyHash(updatePluginHash);
            }}
            outlined
            padding={ms(10)}
          >
            Copy
          </Button>
        )}
      </View>
      {chainId !== optimism.id && (
        <View gap="$s4">
          <Text fontSize={ms(16)}>Borrow</Text>
          <Input
            inputMode="numeric"
            onChange={(event) => {
              setBorrowAmount(Number(event.nativeEvent.text));
            }}
            value={borrowAmount.toString()}
          />
          {borrowHash && (
            <View borderColor="$borderNeutralSoft" borderRadius="$r4" borderWidth={2} padding={ms(10)}>
              <Text fontFamily="$mono" fontSize={ms(14)} fontWeight="bold" textAlign="center" width="100%">
                {borrowHash}
              </Text>
            </View>
          )}
          <View flexDirection="row" gap="$s4">
            <Button
              contained
              disabled={floatingUSDCDeposit === 0n || !borrowUSDCSimulation}
              flex={1}
              onPress={borrowUSDC}
              padding={ms(10)}
            >
              Borrow USDC
            </Button>
            {borrowHash && (
              <Button
                borderRadius="$r2"
                flex={1}
                onPress={() => {
                  copyHash(borrowHash);
                }}
                outlined
                padding={ms(10)}
              >
                Copy
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
