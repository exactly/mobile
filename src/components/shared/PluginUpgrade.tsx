import { exaPluginAbi, exaPluginAddress } from "@exactly/common/generated/chain";
import latestExaPlugin from "@exactly/common/latestExaPlugin";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { encodeAbiParameters, encodeFunctionData, getAbiItem, keccak256, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import InfoBadge from "./InfoBadge";
import {
  upgradeableModularAccountAbi,
  useReadExaPluginPluginManifest,
  useReadUpgradeableModularAccountGetInstalledPlugins,
  useSimulateUpgradeableModularAccountUninstallPlugin,
} from "../../generated/contracts";
import { accountClient } from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";

export default function PluginUpgrade() {
  const { address } = useAccount();
  const { data: installedPlugins, refetch: refetchInstalledPlugins } =
    useReadUpgradeableModularAccountGetInstalledPlugins({ address, query: { refetchOnMount: true } });
  const { data: pluginManifest } = useReadExaPluginPluginManifest({ address: exaPluginAddress });
  const { data: uninstallPluginSimulation } = useSimulateUpgradeableModularAccountUninstallPlugin({
    address,
    args: [installedPlugins?.[0] ?? zeroAddress, "0x", "0x"],
    query: { enabled: !!address && !!installedPlugins },
  });
  const { mutateAsync: updatePlugin, isPending: isUpdating } = useMutation({
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
    onSuccess: async () => {
      await refetchInstalledPlugins();
    },
  });
  if (!installedPlugins || installedPlugins[0] === latestExaPlugin) return null;
  return (
    <InfoBadge
      title="An account upgrade is required to access the latest features."
      actionText="Upgrade account now"
      loading={isUpdating}
      onPress={() => {
        updatePlugin().catch(handleError);
      }}
    />
  );
}
