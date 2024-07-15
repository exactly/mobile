import React from "react";
import { StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "react-native-size-matters";
import { View, useWindowDimensions } from "tamagui";

import type { Page } from "./Carousel";

interface ListItemProperties {
  item: Page;
  index: number;
  x: SharedValue<number>;
}

const ListItem = ({ item, index, x }: ListItemProperties) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const itemWidth = width - insets.left - insets.right - moderateScale(20);

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
    <View
      style={styles.container}
      display="flex"
      alignItems="center"
      alignContent="center"
      justifyContent="center"
      height="100%"
      width={width - moderateScale(20)}
      flex={1}
    >
      <Animated.View style={[styles.bgImage, rBackgroundStyle]}>
        <item.backgroundImage />
      </Animated.View>
      <Animated.View style={[styles.image, rImageStyle]}>
        <item.image />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  bgImage: {
    position: "absolute",
  },
  container: {
    display: "flex",
    flex: 1,
  },
  image: {
    position: "absolute",
  },
});

export default ListItem;
