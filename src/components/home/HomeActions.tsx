import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";

import Button from "../shared/Button";
import View from "../shared/View";

export default function HomeActions() {
  return (
    <View flexDirection="row" display="flex" gap="$s4" justifyContent="center" alignItems="center">
      <Button
        contained
        main
        spaced
        halfWidth
        onPress={() => {
          router.push("/add-funds/add-crypto");
        }}
        iconAfter={<ArrowDownToLine color="$interactiveOnBaseBrandDefault" />}
      >
        Add funds
      </Button>
      <Button
        outlined
        main
        spaced
        halfWidth
        onPress={() => {
          router.push("/send-funds");
        }}
        iconAfter={<ArrowUpRight color="$interactiveOnBaseBrandSoft" />}
      >
        Send
      </Button>
    </View>
  );
}
