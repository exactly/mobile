import React from "react";
import { interpolate, type SharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { ms } from "react-native-size-matters";

import AnimatedView from "../shared/AnimatedView";
import View from "../shared/View";
import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";

interface FlipCardProperties {
  Back: React.ReactNode;
  flipped: SharedValue<boolean>;
  Front: React.ReactNode;
}

export default function FlipCard({ Back, flipped, Front }: FlipCardProperties) {
  const frontAnimatedStyles = useAnimatedStyle(() => {
    const spinValue = interpolate(Number(flipped.value), [0, 1], [0, 180]);
    const rotateValue = withTiming(`${spinValue.toString()}deg`, { duration: 500 });
    return { transform: [{ rotateY: rotateValue }] };
  });
  const backAnimatedStyles = useAnimatedStyle(() => {
    const spinValue = interpolate(Number(flipped.value), [0, 1], [180, 360]);
    const rotateValue = withTiming(`${spinValue.toString()}deg`, { duration: 500 });
    return { transform: [{ rotateY: rotateValue }] };
  });
  return (
    <View aspectRatio={ISO7810_ASPECT_RATIO} borderRadius="$r3" maxWidth={ms(350)} overflow="hidden" width="100%">
      <AnimatedView backfaceVisibility="hidden" height="100%" style={frontAnimatedStyles} width="100%">
        {Front}
      </AnimatedView>
      <AnimatedView
        backfaceVisibility="hidden"
        bottom={0}
        left={0}
        position="absolute"
        right={0}
        style={backAnimatedStyles}
        top={0}
        zIndex={2}
      >
        {Back}
      </AnimatedView>
    </View>
  );
}
