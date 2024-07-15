import { ArrowLineDown, ArrowUpRight } from "phosphor-react-native";
import React from "react";
import { View, useTheme } from "tamagui";

import DelayedActionButton from "../shared/DelayedActionButton";

const onAddFunds = () => {};
const onSend = () => {};

const HomeActions = () => {
  const theme = useTheme();
  return (
    <View flexDirection="row" display="flex" gap={10} justifyContent="center" alignItems="center">
      <DelayedActionButton
        content="Add funds"
        onPress={onAddFunds}
        Icon={<ArrowLineDown size={24} color={theme.textInteractiveBaseBrandDefault.val as string} />}
        variant="primary"
      />
      <DelayedActionButton
        content="Send"
        onPress={onSend}
        Icon={<ArrowUpRight size={24} color={theme.textInteractiveBaseBrandSoftDefault.val as string} />}
        variant="secondary"
      />
    </View>
  );
};

export default HomeActions;
