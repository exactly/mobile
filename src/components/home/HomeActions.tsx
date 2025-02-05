import { exaPluginAbi, exaPluginAddress, upgradeableModularAccountAbi } from "@exactly/common/generated/chain";
import latestExaPlugin from "@exactly/common/latestExaPlugin";
import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { PixelRatio } from "react-native";
import { ms } from "react-native-size-matters";
import { Spinner } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { useReadUpgradeableModularAccountGetInstalledPlugins } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function HomeActions() {
  const fontScale = PixelRatio.getFontScale();
  const { address: account } = useAccount();

  const { data: installedPlugins } = useReadUpgradeableModularAccountGetInstalledPlugins({
    address: account ?? zeroAddress,
  });
  const isLatestPlugin = installedPlugins?.[0] === latestExaPlugin;
  const { refetch: refetchProposals, isFetching: isFetchingProposals } = useReadContract(
    isLatestPlugin
      ? {
          functionName: "proposals",
          abi: [...upgradeableModularAccountAbi, ...exaPluginAbi],
          address: exaPluginAddress,
          args: [account ?? zeroAddress],
          query: { enabled: !!account },
        }
      : {
          functionName: "proposals",
          abi: [
            ...upgradeableModularAccountAbi,
            {
              type: "function",
              inputs: [{ name: "account", internalType: "address", type: "address" }],
              name: "proposals",
              outputs: [
                { name: "amount", internalType: "uint256", type: "uint256" },
                { name: "market", internalType: "contract IMarket", type: "address" },
                { name: "receiver", internalType: "address", type: "address" },
                { name: "timestamp", internalType: "uint256", type: "uint256" },
              ],
              stateMutability: "view",
            },
          ],
          address: installedPlugins?.[0],
          args: [account ?? zeroAddress],
          query: { enabled: !!account && !!installedPlugins?.[0] },
        },
  );

  const handleSend = async () => {
    if (isFetchingProposals) return;
    const { data: proposals } = await refetchProposals();
    if (proposals && proposals[0] > 0n) {
      router.push(`/send-funds/processing`);
    } else {
      router.push(`/send-funds`);
    }
  };
  return (
    <View flexDirection="row" display="flex" gap="$s4" justifyContent="center" alignItems="center">
      <Button
        main
        spaced
        onPress={() => {
          router.push("/add-funds/add-crypto");
        }}
        iconAfter={<ArrowDownToLine size={ms(18) * fontScale} color="$interactiveOnBaseBrandDefault" />}
        backgroundColor="$interactiveBaseBrandDefault"
        color="$interactiveOnBaseBrandDefault"
        {...contained}
      >
        <Text
          fontSize={ms(15)}
          emphasized
          numberOfLines={1}
          adjustsFontSizeToFit
          color="$interactiveOnBaseBrandDefault"
        >
          Add funds
        </Text>
      </Button>
      <Button
        main
        spaced
        onPress={() => {
          handleSend().catch(handleError);
        }}
        disabled={isFetchingProposals}
        iconAfter={
          isFetchingProposals ? (
            <Spinner height={ms(18) * fontScale} width={ms(18) * fontScale} color="$interactiveOnBaseBrandSoft" />
          ) : (
            <ArrowUpRight size={ms(18) * fontScale} color="$interactiveOnBaseBrandSoft" />
          )
        }
        backgroundColor="$interactiveBaseBrandSoftDefault"
        color="$interactiveOnBaseBrandSoft"
        {...outlined}
      >
        <Text fontSize={ms(15)} emphasized numberOfLines={1} adjustsFontSizeToFit color="$interactiveOnBaseBrandSoft">
          Send
        </Text>
      </Button>
    </View>
  );
}

const contained = {
  hoverStyle: { backgroundColor: "$interactiveBaseBrandHover" },
  pressStyle: { backgroundColor: "$interactiveBaseBrandPressed" },
};

const outlined = {
  hoverStyle: { backgroundColor: "$interactiveBaseBrandSoftHover" },
  pressStyle: {
    backgroundColor: "$interactiveBaseBrandSoftPressed",
    color: "$interactiveOnBaseBrandSoft",
  },
};
