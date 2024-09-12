import React from "react";
import { interpolate, useAnimatedStyle, withTiming, type SharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";

import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";
import AnimatedView from "../shared/AnimatedView";
import View from "../shared/View";

interface FlipCardProperties {
  flipped: SharedValue<boolean>;
  Front: React.ReactNode;
  Back: React.ReactNode;
}

export default function FlipCard({ flipped, Front, Back }: FlipCardProperties) {
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
    <View aspectRatio={ISO7810_ASPECT_RATIO} width="100%" maxWidth={ms(350)} overflow="hidden" borderRadius="$r3">
      <AnimatedView style={frontAnimatedStyles} backfaceVisibility="hidden" width="100%" height="100%">
        {Front}
      </AnimatedView>
      <AnimatedView
        style={backAnimatedStyles}
        backfaceVisibility="hidden"
        zIndex={2}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
      >
        {Back}
      </AnimatedView>
    </View>
  );
}
