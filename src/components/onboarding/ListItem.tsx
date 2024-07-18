import React, { memo } from "react";
import type { SharedValue } from "react-native-reanimated";
import { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { View, useWindowDimensions } from "tamagui";

import type { Page } from "./Carousel";
import AnimatedView from "../shared/AnimatedView";

interface ListItemProperties {
  item: Page;
  index: number;
  x: SharedValue<number>;
}

const ListItem = ({ item, index, x }: ListItemProperties) => {
  const { width } = useWindowDimensions();
  const itemWidth = width - ms(40);

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
    <View width={itemWidth} height="100%" justifyContent="center" alignItems="center">
      <AnimatedView position="absolute" style={rBackgroundStyle}>
        <item.backgroundImage />
      </AnimatedView>
      <AnimatedView position="absolute" style={rImageStyle}>
        <item.image />
      </AnimatedView>
    </View>
  );
};

export default memo(ListItem);
