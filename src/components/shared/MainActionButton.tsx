import type { IconProps } from "@tamagui/helpers-icon";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Spinner, Text, View, useTheme } from "tamagui";

import { radius } from "../../utils/theme";

interface MainActionButtonProperties {
  content: string;
  isLoading?: boolean;
  loadingContent?: string;
  Icon?: React.FC<IconProps>;
  onPress: () => void;
}

export default function MainActionButton({
  content,
  onPress,
  Icon,
  isLoading = false,
  loadingContent = "Loading...",
}: MainActionButtonProperties) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.r3,
        backgroundColor: pressed ? theme.interactiveBaseBrandPressed.get() : theme.interactiveBaseBrandDefault.get(),
      })}
    >
      <View borderRadius="$r3" height={ms(56)} overflow="hidden" position="relative">
        <View
          alignItems="center"
          flexDirection="row"
          height="100%"
          justifyContent="space-between"
          paddingHorizontal={ms(20)}
          position="relative"
        />
        <View
          position="absolute"
          backgroundColor="transparent"
          alignItems="center"
          flexDirection="row"
          height="100%"
          width="100%"
          justifyContent="space-between"
          paddingHorizontal={ms(20)}
          gap={ms(10)}
        >
          <Text fontSize={ms(14)} fontWeight={600} color="$interactiveOnBaseBrandDefault">
            {isLoading ? loadingContent : content}
          </Text>
          {isLoading && <Spinner color="$interactiveOnBaseBrandDefault" />}
          {!isLoading && Icon && <Icon color={theme.interactiveBaseBrandSoftDefault.get()} fontWeight="bold" />}
        </View>
        <View
          alignItems="center"
          flexDirection="row"
          height="100%"
          justifyContent="space-between"
          paddingHorizontal={ms(20)}
          position="relative"
          backgroundColor="$interactiveBaseBrandDefault"
        />
      </View>
    </Pressable>
  );
}
