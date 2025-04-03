import { exaPluginAddress } from "@exactly/common/generated/chain";
import { ArrowUpToLine } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { YStack } from "tamagui";
import { encodeAbiParameters, encodeFunctionData, getAbiItem, keccak256, zeroAddress } from "viem";
import { useAccount, useBytecode, useSimulateContract, useWriteContract } from "wagmi";

import Progression from "./Progression";
import {
  exaPluginAbi,
  upgradeableModularAccountAbi,
  useReadExaPluginPluginManifest,
  useReadUpgradeableModularAccountGetInstalledPlugins,
  useSimulateUpgradeableModularAccountUninstallPlugin,
} from "../../../generated/contracts";
import { accountClient } from "../../../utils/alchemyConnector";
import queryClient from "../../../utils/queryClient";
import reportError from "../../../utils/reportError";
import Button from "../../shared/Button";
import Spinner from "../../shared/Spinner";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function UpgradeAccount() {
  const { address } = useAccount();
  const toast = useToastController();
  const [timerShown, setTimerShown] = useState(false);
  const { data: bytecode } = useBytecode({ address: address ?? zeroAddress, query: { enabled: !!address } });
  const { data: installedPlugins, refetch: refetchInstalledPlugins } =
    useReadUpgradeableModularAccountGetInstalledPlugins({
      address,
      query: { refetchOnMount: true, enabled: !!address && !!bytecode },
    });
  const { data: pluginManifest } = useReadExaPluginPluginManifest({ address: exaPluginAddress });
  const isLatestPlugin = installedPlugins?.[0] === exaPluginAddress;
  const { data: proposeUninstallSimulation } = useSimulateContract({
    address,
    functionName: "proposeUninstall",
    abi: [{ type: "function", name: "proposeUninstall", inputs: [], outputs: [], stateMutability: "nonpayable" }],
    query: { enabled: !!address && !!installedPlugins && !!bytecode },
  });
  const { data: uninstallPluginSimulation } = useSimulateUpgradeableModularAccountUninstallPlugin({
    address,
    args: [installedPlugins?.[0] ?? zeroAddress, "0x", "0x"],
    query: { enabled: !!address && !!installedPlugins && !!bytecode },
  });
  const { writeContract: proposeUninstall } = useWriteContract();
  const { data: step } = useQuery<number | undefined>({ queryKey: ["card-upgrade"] });

  const { mutateAsync: upgradeAccount, isPending: isUpgrading } = useMutation({
    mutationFn: async () => {
      if (isLatestPlugin) {
        queryClient.setQueryData(["card-upgrade"], 2);
        return;
      }
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
      await accountClient.waitForUserOperationTransaction(hash);
    },
    onSuccess: () => {
      toast.show("Account upgraded!", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "success" },
      });
      queryClient.setQueryData(["card-upgrade"], 2);
    },
    onError: () => {
      toast.show("Error upgrading account", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "error", preset: "error" },
      });
    },
    onSettled: async () => {
      await refetchInstalledPlugins();
    },
  });

  const { mutateAsync: proposeUninstallPlugin, isPending: isProposingUninstall } = useMutation({
    mutationFn: async () => {
      if (isLatestPlugin) {
        queryClient.setQueryData(["card-upgrade"], 2);
      }
      if (!proposeUninstallSimulation) throw new Error("no propose uninstall plugin simulation");
      proposeUninstall(proposeUninstallSimulation.request);
      setTimerShown(true);
      await new Promise((resolve) => setTimeout(resolve, 65_000));
    },
    onSuccess: () => {
      toast.show("Uninstall proposed", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "success" },
      });
    },
    onError: () => {
      toast.show("Error proposing uninstall", {
        native: true,
        duration: 1000,
        burntOptions: { haptic: "error", preset: "error" },
      });
    },
    onSettled: async () => {
      setTimerShown(false);
      await refetchInstalledPlugins();
    },
  });
  return (
    <View fullScreen flex={1} gap="$s6" paddingHorizontal="$s5" paddingTop="$s5" backgroundColor="$backgroundSoft">
      {isUpgrading ? (
        <>
          <YStack gap="$s6" justifyContent="center" alignItems="center">
            <Spinner color="$uiNeutralPrimary" backgroundColor="$backgroundMild" containerSize={52} size={32} />
            <YStack gap="$s2" justifyContent="center" alignItems="center">
              <Text emphasized title3 color="$uiNeutralSecondary">
                Updating your account
              </Text>
              <Text color="$uiNeutralSecondary" footnote>
                STEP {(step ?? 0) + 1} OF 3
              </Text>
            </YStack>
            <Text color="$uiNeutralSecondary" subHeadline alignSelf="center" textAlign="center">
              This may take {timerShown ? "up to 1 minute" : "a moment"} to complete. Please wait.
            </Text>
          </YStack>
        </>
      ) : (
        <>
          <YStack gap="$s4">
            <ArrowUpToLine size={32} color="$uiBrandSecondary" />
            <Text emphasized title3 color="$uiBrandSecondary">
              Upgrade your account
            </Text>
          </YStack>
          <YStack>
            <Text color="$uiNeutralSecondary" subHeadline>
              Update your Exa account to support our new card provider. This quick step ensures a smooth transition to
              your upgraded Exa Card.
            </Text>
          </YStack>
          <Progression />
        </>
      )}
      <YStack paddingBottom="$s7" gap="$s4">
        {!isLatestPlugin && proposeUninstallSimulation && (
          <Button
            disabled={isProposingUninstall}
            onPress={() => {
              proposeUninstallPlugin().catch(reportError);
            }}
            flexBasis={60}
            contained
            main
            spaced
            fullwidth
            backgroundColor={isProposingUninstall ? "$interactiveDisabled" : "$interactiveBaseBrandDefault"}
            color={isProposingUninstall ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandDefault"}
            iconAfter={
              isProposingUninstall ? (
                <Spinner color="$interactiveOnDisabled" containerSize={24} size={16} />
              ) : (
                <ArrowUpToLine strokeWidth={2.5} color="$interactiveOnBaseBrandDefault" />
              )
            }
          >
            {isProposingUninstall ? "Proposing uninstall" : "1. Propose uninstall"}
          </Button>
        )}

        {!isLatestPlugin && !isProposingUninstall && uninstallPluginSimulation && (
          <Button
            disabled={isUpgrading}
            onPress={() => {
              upgradeAccount().catch(reportError);
            }}
            flexBasis={60}
            contained
            main
            spaced
            fullwidth
            backgroundColor={isUpgrading ? "$interactiveDisabled" : "$interactiveBaseBrandDefault"}
            color={isUpgrading ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandDefault"}
            iconAfter={
              <ArrowUpToLine
                strokeWidth={2.5}
                color={isUpgrading ? "$interactiveOnDisabled" : "$interactiveOnBaseBrandDefault"}
              />
            }
          >
            2. Upgrade account now
          </Button>
        )}
      </YStack>
    </View>
  );
}
