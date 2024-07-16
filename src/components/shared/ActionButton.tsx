import React from "react";
import { TouchableWithoutFeedback } from "react-native";
import { Text, View } from "tamagui";

interface ActionButtonProperties {
  content: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
  onPress: () => void;
}

const ActionButton = ({ content, onPress, icon, variant }: ActionButtonProperties) => {
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View
        backgroundColor={variant === "primary" ? "$interactiveBaseBrandDefault" : "$interactiveBaseBrandSoftDefault"}
        flex={1}
        height={64}
        borderRadius={10}
        alignItems="center"
        flexDirection="row"
        justifyContent="flex-start"
        padding={20}
        gap={10}
      >
        <View justifyContent="space-between" gap={10} flexDirection="row" flex={1}>
          <Text
            fontSize={18}
            lineHeight={21}
            color={variant === "primary" ? "$textInteractiveBaseBrandDefault" : "$textInteractiveBaseBrandSoftDefault"}
          >
            {content}
          </Text>
          {icon ? <View>{icon}</View> : <></>}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default ActionButton;
