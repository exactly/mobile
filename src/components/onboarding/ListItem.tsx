import React, { memo } from "react";
import { StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { View, useWindowDimensions } from "tamagui";

import type { Page } from "./Carousel";
import AnimatedView from "../shared/AnimatedView";

interface ListItemProperties {
  item: Page;
  index: number;
  x: SharedValue<number>;
}

export default memo(function ListItem({ item, index, x }: ListItemProperties) {
  const { width: itemWidth } = useWindowDimensions();
  const originalWidth = 1200;
  const originalHeight = 1200;
  const aspectRatio = originalWidth / originalHeight;
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
    return { transform: [{ scale: animatedScale }], opacity: interpolatedOpacity };
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
    <View width={itemWidth} aspectRatio={aspectRatio} justifyContent="center" alignItems="center">
      <AnimatedView width="100%" height="100%" style={rBackgroundStyle}>
        <item.backgroundImage width="100%" height="100%" />
      </AnimatedView>
      <AnimatedView width="100%" height="100%" style={[StyleSheet.absoluteFillObject, rImageStyle]}>
        <item.image width="100%" height="100%" />
      </AnimatedView>
    </View>
  );
});
