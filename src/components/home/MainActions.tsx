import { ArrowLineDown, ArrowUpRight } from "phosphor-react-native";
import React from "react";
import { View, useTheme } from "tamagui";

import ActionButton from "../shared/ActionButton";

const onAddFunds = () => {};
const onSend = () => {};

const MainActions = () => {
  const theme = useTheme();
  return (
    <View flexDirection="row" display="flex" gap={10} justifyContent="center" alignItems="center">
      <ActionButton
        content="Add funds"
        onPress={onAddFunds}
        icon={<ArrowLineDown size={24} color={theme.textInteractiveBaseBrandDefault?.val as string} />}
        variant="primary"
      />
      <ActionButton
        content="Send"
        onPress={onSend}
        icon={<ArrowUpRight size={24} color={theme.textInteractiveBaseBrandSoftDefault?.val as string} />}
        variant="secondary"
      />
    </View>
  );
};

export default MainActions;
