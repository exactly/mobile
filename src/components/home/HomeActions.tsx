import { ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Alert } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Button from "../shared/Button";

function addFunds() {
  router.push("/add-funds");
}
function send() {
  Alert.alert("Send", "Send funds to another account", [{ text: "OK" }]);
}
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
        onPress={addFunds}
        iconAfter={<ArrowDownToLine color="$interactiveOnBaseBrandDefault" />}
      >
        Add funds
      </Button>
      <Button
        outlined
        main
        spaced
        halfWidth
        onPress={send}
        iconAfter={<ArrowUpRight color="$interactiveOnBaseBrandSoft" />}
      >
        Send
      </Button>
    </View>
  );
}
