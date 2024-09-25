import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";

import Button from "../shared/Button";
import View from "../shared/View";

export default function HomeActions() {
  return (
    <View flexDirection="row" display="flex" gap="$s4" justifyContent="center" alignItems="center">
      <Button
        main
        spaced
        onPress={() => {
          router.push("/add-funds/add-crypto");
        }}
        iconAfter={<ArrowDownToLine color="$interactiveOnBaseBrandDefault" />}
        backgroundColor="$interactiveBaseBrandDefault"
        color="$interactiveOnBaseBrandDefault"
        {...contained}
      >
        Add funds
      </Button>
      <Button
        main
        spaced
        onPress={() => {
          router.push("/send-funds");
        }}
        iconAfter={<ArrowUpRight color="$interactiveOnBaseBrandSoft" />}
        backgroundColor="$interactiveBaseBrandSoftDefault"
        color="$interactiveOnBaseBrandSoft"
        {...outlined}
      >
        Send
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
