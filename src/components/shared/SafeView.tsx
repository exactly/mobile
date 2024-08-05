import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ViewProps } from "tamagui";
import { View } from "tamagui";

export default function SafeView(properties: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      width="100%"
      height="100%"
      paddingTop={insets.top}
      paddingLeft={insets.left}
      paddingRight={insets.right}
      paddingBottom={insets.bottom}
      backgroundColor="$backgroundMild"
      {...properties}
    />
  );
}
