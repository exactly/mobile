import { exaPluginAddress } from "@exactly/common/generated/chain";
import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { PixelRatio } from "react-native";
import { ms } from "react-native-size-matters";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadExaPluginProposals } from "../../generated/contracts";
import queryClient from "../../utils/queryClient";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function HomeActions() {
  const fontScale = PixelRatio.getFontScale();
  const { address } = useAccount();

  const { data: proposal } = useReadExaPluginProposals({
    address: exaPluginAddress,
    args: [address ?? zeroAddress],
  });

  const handleSend = () => {
    if (proposal && proposal[0] > 0n) {
      queryClient.setQueryData(["proposal", "withdrawal"], proposal);
      router.push(`/send-funds/processing-transaction`);
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
          handleSend();
        }}
        iconAfter={<ArrowUpRight size={ms(18) * fontScale} color="$interactiveOnBaseBrandSoft" />}
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
