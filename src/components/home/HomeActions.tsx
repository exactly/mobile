import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";

import Button from "../shared/Button";
import View from "../shared/View";

export default function HomeActions() {
  return (
    <View alignItems="center" display="flex" flexDirection="row" gap="$s4" justifyContent="center">
      <Button
        backgroundColor="$interactiveBaseBrandDefault"
        color="$interactiveOnBaseBrandDefault"
        iconAfter={<ArrowDownToLine color="$interactiveOnBaseBrandDefault" />}
        main
        onPress={() => {
          router.push("/add-funds/add-crypto");
        }}
        spaced
        {...contained}
      >
        Add funds
      </Button>
      <Button
        backgroundColor="$interactiveBaseBrandSoftDefault"
        color="$interactiveOnBaseBrandSoft"
        iconAfter={<ArrowUpRight color="$interactiveOnBaseBrandSoft" />}
        main
        onPress={() => {
          router.push("/send-funds");
        }}
        spaced
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
