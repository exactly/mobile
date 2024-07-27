import type { IconProps } from "@tamagui/helpers-icon";
import React from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

interface ActionButtonProperties extends PressableProps {
  content: string;
  Icon?: React.FC<IconProps>;
  secondary?: boolean;
}

export default function ActionButton({ content, Icon, secondary, ...rest }: ActionButtonProperties) {
  const theme = useTheme();
  const { disabled } = rest;

  const getButtonColors = (pressed: boolean) => {
    if (disabled) {
      return {
        backgroundColor: "$interactiveDisabled",
        textColor: theme.interactiveOnDisabled.get(),
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
            gap={ms(10)}
            height={ms(64)}
            paddingHorizontal={ms(20)}
            borderRadius="$r3"
            minWidth={ms(150)}
            maxHeight={ms(64)}
          >
            <Text color={textColor} fontSize={ms(14)} fontWeight="bold">
              {content}
            </Text>
            {Icon && <Icon color={textColor} fontWeight="bold" />}
          </View>
        );
      }}
    </Pressable>
  );
}
