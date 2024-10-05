import type { SharedValue } from "react-native-reanimated";

import React, { memo } from "react";
import { StyleSheet } from "react-native";
import { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useWindowDimensions, View } from "tamagui";

import type { Page } from "./Carousel";

import AnimatedView from "../shared/AnimatedView";

interface ListItemProperties {
  index: number;
  item: Page;
  x: SharedValue<number>;
}

export default memo(function ListItem({ index, item, x }: ListItemProperties) {
  const { width: itemWidth } = useWindowDimensions();

  const rBackgroundStyle = useAnimatedStyle(() => {
    const animatedScale = interpolate(
      x.value,
      [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const interpolatedOpacity = interpolate(
      x.value,
      [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: interpolatedOpacity, transform: [{ scale: animatedScale }] };
  }, [index, x]);
  const rImageStyle = useAnimatedStyle(() => {
    const animatedScale = interpolate(
      x.value,
      [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale: animatedScale }] };
  }, [index, x]);
  return (
    <View alignItems="center" aspectRatio={1} justifyContent="center" width={itemWidth}>
      <AnimatedView height="100%" style={rBackgroundStyle} width="100%">
        <item.backgroundImage height="100%" width="100%" />
      </AnimatedView>
      <AnimatedView height="100%" style={[StyleSheet.absoluteFillObject, rImageStyle]} width="100%">
        <item.image height="100%" width="100%" />
      </AnimatedView>
    </View>
  );
});
