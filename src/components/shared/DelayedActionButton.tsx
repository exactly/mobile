import type { IconProps } from "phosphor-react-native";
import React from "react";
import type { DimensionValue } from "react-native";
import { StyleSheet, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { Spinner, Text, View, useTheme } from "tamagui";

interface DelayedActionButtonProperties {
  content: string;
  isLoading?: boolean;
  Icon?: React.FC<IconProps>;
  onPress: () => void;
}

export default function DelayedActionButton({ content, onPress, Icon, isLoading }: DelayedActionButtonProperties) {
  const theme = useTheme();
  const color = theme.interactiveBaseBrandPressed.get() as string;
  const fillAnim = useSharedValue(0);

  const handlePressIn = () => {
    fillAnim.value = withTiming(1, { duration: 1000 }, (finished) => {
      if (finished) {
        runOnJS(onPress)();
      }
    });
  };

  const handlePressOut = () => {
    fillAnim.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: (String(fillAnim.value * 100) + "%") as DimensionValue,
      backgroundColor: color,
      borderRadius: 10,
      opacity: 1,
    };
  });

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View borderRadius={10} height={ms(56)} overflow="hidden" position="relative">
        <View
          alignItems="center"
          flexDirection="row"
          height="100%"
          justifyContent="space-between"
          paddingHorizontal={ms(20)}
          position="relative"
          $platform-android={{
            backgroundColor: theme.interactiveBaseBrandDefault.val as string,
          }}
          $platform-ios={{
            backgroundColor: "$interactiveBaseBrandDefault",
          }}
        />
        <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]} />

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
          <Text fontSize={ms(14)} fontWeight={600} color="$textInteractiveBaseBrandDefault">
            {isLoading ? "Creating account..." : content}
          </Text>
          {isLoading && <Spinner color="$textInteractiveBaseBrandDefault" />}
          {!isLoading && Icon && <Icon color={theme.interactiveBaseBrandSoftDefault.get() as string} weight="bold" />}
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
