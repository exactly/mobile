import type { IconProps } from "phosphor-react-native";
import React from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

interface ActionButtonProperties extends PressableProps {
  content: string;
  Icon?: React.FC<IconProps>;
  secondary?: boolean;
}

const ActionButton = ({ content, Icon, secondary, ...rest }: ActionButtonProperties) => {
  const theme = useTheme();
  const { disabled } = rest;

  const getButtonColors = (pressed: boolean) => {
    if (disabled) {
      return {
        backgroundColor: "$interactiveDisabled",
        textColor: theme.interactiveOnDisabled.get() as string,
      };
    }

    if (pressed) {
      return {
        backgroundColor: secondary ? "$interactiveBaseBrandSoftPressed" : "$interactiveBaseBrandPressed",
        textColor: String(
          secondary ? theme.interactiveBaseBrandPressed.get() : theme.interactiveBaseBrandSoftPressed.get(),
        ),
      };
    }

    return {
      backgroundColor: secondary ? "$interactiveBaseBrandSoftHover" : "$interactiveBaseBrandHover",
      textColor: String(secondary ? theme.interactiveBaseBrandHover.get() : theme.interactiveBaseBrandSoftHover.get()),
    };
  };

  return (
    <Pressable {...rest}>
      {({ pressed }) => {
        const { backgroundColor, textColor } = getButtonColors(pressed);
        return (
          <View
            display="flex"
            flexDirection="row"
            backgroundColor={backgroundColor}
            alignItems="center"
            justifyContent="space-between"
            gap={moderateScale(10)}
            height={moderateScale(64)}
            paddingHorizontal={moderateScale(20)}
            borderRadius={10}
            minWidth={moderateScale(150)}
            maxHeight={moderateScale(64)}
          >
            <Text color={textColor} fontSize={moderateScale(14)} fontWeight="bold">
              {content}
            </Text>
            {Icon && <Icon color={textColor} weight="bold" />}
          </View>
        );
      }}
    </Pressable>
  );
};

export default ActionButton;
