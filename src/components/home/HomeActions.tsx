import { ArrowLineDown, ArrowUpRight } from "phosphor-react-native";
import React from "react";
import type { ViewStyle } from "react-native";
import { Alert } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { View } from "tamagui";

import ActionButton from "../shared/ActionButton";

const onAddFunds = () => {
  Alert.alert("Add funds", "Add funds to your account", [{ text: "OK" }]);
};
const onSend = () => {
  Alert.alert("Send", "Send funds to another account", [{ text: "OK" }]);
};

const homeActionStyle: ViewStyle = { flex: 1, width: "100%" };

const HomeActions = () => {
  return (
    <View flexDirection="row" display="flex" gap={moderateScale(10)} justifyContent="space-between" alignItems="center">
      <ActionButton content="Add funds" onPress={onAddFunds} Icon={ArrowLineDown} style={homeActionStyle} />
      <ActionButton content="Send" onPress={onSend} Icon={ArrowUpRight} secondary disabled style={homeActionStyle} />
    </View>
  );
};

export default HomeActions;
