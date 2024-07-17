import React from "react";
import type { DimensionValue } from "react-native";
import { StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ms } from "react-native-size-matters";
import { useTheme, useWindowDimensions, View } from "tamagui";

type Properties = {
  length: number;
  x: SharedValue<number>;
  progress: SharedValue<number>;
};

const PaginationComponent = ({
  index,
  x,
  progress,
  activeColor,
}: {
  index: number;
  x: SharedValue<number>;
  progress: SharedValue<number>;
  activeColor: string;
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const itemWidth = width - insets.left - insets.right - ms(20);

  const rPaginatorStyle = useAnimatedStyle(() => {
    const interpolatedWidth = interpolate(
      x.value,
      [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
      [8, 24, 8],
      Extrapolation.CLAMP,
    );

    return {
      width: interpolatedWidth,
      backgroundColor: "rgba(0,0,0,0.1)",
      overflow: "hidden",
    };
  }, [x]);

  const rFillStyle = useAnimatedStyle(() => {
    const isActive = interpolate(
      x.value,
      [(index - 0.5) * itemWidth, index * itemWidth, (index + 0.5) * itemWidth],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      width: isActive ? (((progress.value * 100).toString() + "%") as DimensionValue) : "0%",
      backgroundColor: activeColor,
    };
  }, [progress, x]);

  return (
    <Animated.View style={[styles.itemStyle, rPaginatorStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, rFillStyle]} />
    </Animated.View>
  );
};

const Pagination = ({ length, x, progress }: Properties) => {
  const theme = useTheme();
  return (
    <View alignItems="center" flexDirection="row" justifyContent="center" paddingVertical={10}>
      {Array.from({ length }).map((_, index) => {
        return (
          <PaginationComponent
            index={index}
            key={index}
            x={x}
            progress={progress}
            activeColor={theme.interactiveBaseBrandDefault.val as string}
          />
        );
      })}
    </View>
  );
};

export default Pagination;

const styles = StyleSheet.create({
  itemStyle: {
    borderRadius: 5,
    height: 4,
    marginHorizontal: 5,
  },
});
