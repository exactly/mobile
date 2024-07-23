import { SpinnerGap } from "phosphor-react-native";
import React from "react";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

const AnimatedSpinner = Animated.createAnimatedComponent(SpinnerGap);

export default function Spinner() {
  const rotation = useSharedValue(0);
  const rStyle = useAnimatedStyle(() => {
    rotation.value += 5;
    const rotationValue = `${(rotation.value % 360).toString()}deg`;
    return { transform: [{ rotate: rotationValue }] };
  });
  return (
    <View
      backgroundColor="$backgroundMild"
      width={ms(88)}
      height={ms(88)}
      justifyContent="center"
      alignItems="center"
      borderRadius="$r_0"
    >
      <AnimatedSpinner style={rStyle} />
    </View>
  );
}
