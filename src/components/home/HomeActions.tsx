import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Alert } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Button from "../shared/Button";

const onAddFunds = () => {
  router.push("add-funds");
};
const onSend = () => {
  Alert.alert("Send", "Send funds to another account", [{ text: "OK" }]);
};

export default function HomeActions() {
  return (
    <View
      flexDirection="row"
      display="flex"
      gap={ms(10)}
      justifyContent="space-between"
      alignItems="center"
      paddingVertical={ms(10)}
    >
      <Button
        contained
        onPress={onAddFunds}
        iconAfter={ArrowDownToLine}
        spaceFlex
        height={ms(64)}
        padding="$s4_5"
        scaleIcon={1.5}
      >
        Add funds
      </Button>
      <Button
        outlined
        onPress={onSend}
        iconAfter={ArrowUpRight}
        spaceFlex
        height={ms(64)}
        padding="$s4_5"
        scaleIcon={1.5}
      >
        Send
      </Button>
    </View>
  );
}
