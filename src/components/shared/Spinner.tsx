import { Loader } from "@tamagui/lucide-icons";
import React from "react";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";

import AnimatedView from "./AnimatedView";

export default function Spinner() {
  const rotation = useSharedValue(0);
  const rStyle = useAnimatedStyle(() => {
    rotation.value += 1;
    const rotationValue = `${(rotation.value % 360).toString()}deg`;
    return { transform: [{ rotate: rotationValue }] };
  });
  return (
    <AnimatedView
      backgroundColor="$backgroundStrong"
      width={ms(88)}
      height={ms(88)}
      justifyContent="center"
      alignItems="center"
      borderRadius="$r_0"
      padding="$5"
      style={rStyle}
    >
      <Loader size={ms(56)} color="$uiBrandSecondary" />
    </AnimatedView>
  );
}
