import type { IconProps } from "phosphor-react-native";
import React from "react";
import type { DimensionValue } from "react-native";
import { TouchableWithoutFeedback, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { scale } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

interface DelayedActionButtonProperties {
  content: string;
  Icon?: React.FC<IconProps>;
  onPress: () => void;
}

const DelayedActionButton = ({ content, onPress, Icon }: DelayedActionButtonProperties) => {
  const theme = useTheme();
  const color = theme.interactiveBaseBrandPressed.get() as string;
  const fillAnim = useSharedValue(0);

  const handlePressIn = () => {
    fillAnim.value = withTiming(1, { duration: 1000 });
  };

  const handlePressOut = () => {
    fillAnim.value = withTiming(0, { duration: 300 });
    if (fillAnim.value === 1) {
      onPress();
    }
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
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View borderRadius={10} height={scale(56)} overflow="hidden" position="relative">
        <View
          alignItems="center"
          flexDirection="row"
          height="100%"
          justifyContent="space-between"
          paddingHorizontal={scale(20)}
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
          paddingHorizontal={scale(20)}
        >
          <Text fontSize={scale(14)} fontWeight={600} color="$textInteractiveBaseBrandDefault">
            {content}
          </Text>
          {Icon && <Icon color={theme.interactiveBaseBrandSoftDefault.get() as string} weight="bold" />}
        </View>
        <View
          alignItems="center"
          flexDirection="row"
          height="100%"
          justifyContent="space-between"
          paddingHorizontal={scale(20)}
          position="relative"
          backgroundColor="$interactiveBaseBrandDefault"
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default DelayedActionButton;
