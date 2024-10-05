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
      alignItems="center"
      backgroundColor="$backgroundStrong"
      borderRadius="$r_0"
      height={ms(88)}
      justifyContent="center"
      padding="$5"
      style={rStyle}
      width={ms(88)}
    >
      <Loader color="$uiBrandSecondary" size={ms(56)} />
    </AnimatedView>
  );
}
