import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Button from "../shared/Button";

export default function HomeActions() {
  return (
    <View
      flexDirection="row"
      display="flex"
      gap={ms(10)}
      justifyContent="center"
      alignItems="center"
      paddingVertical={ms(10)}
    >
      <Button
        contained
        main
        spaced
        halfWidth
        onPress={() => {
          router.push("/add-funds");
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
