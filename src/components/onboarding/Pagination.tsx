import type { SharedValue } from "react-native-reanimated";

import React, { memo } from "react";
import { StyleSheet } from "react-native";
import { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { useTheme, useWindowDimensions, View } from "tamagui";

import AnimatedView from "../shared/AnimatedView";

function PaginationComponent({
  activeColor,
  index,
  progress,
  x,
}: {
  activeColor: string;
  index: number;
  progress: SharedValue<number>;
  x: SharedValue<number>;
}) {
  const { width } = useWindowDimensions();
  const itemWidth = width - ms(40);

  const rPaginatorStyle = useAnimatedStyle(() => {
    const interpolatedWidth = interpolate(
      x.value,
      [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth],
      [8, 24, 8],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: "rgba(0,0,0,0.1)",
      overflow: "hidden",
      width: interpolatedWidth,
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
      backgroundColor: activeColor,
      width: isActive ? `${progress.value * 100}%` : "0%",
    };
  }, [progress, x]);

  return (
    <AnimatedView borderRadius="$r2" height={4} marginHorizontal={5} style={rPaginatorStyle}>
      <AnimatedView style={[StyleSheet.absoluteFill, rFillStyle]} />
    </AnimatedView>
  );
}

interface PaginationProperties {
  length: number;
  progress: SharedValue<number>;
  x: SharedValue<number>;
}

export default memo(function Pagination({ length, progress, x }: PaginationProperties) {
  const theme = useTheme();
  return (
    <View alignItems="center" flexDirection="row" justifyContent="center">
      {Array.from({ length }).map((_, index) => {
        return (
          <PaginationComponent
            activeColor={theme.interactiveBaseBrandDefault.val}
            index={index}
            key={index}
            progress={progress}
            x={x}
          />
        );
      })}
    </View>
  );
});
