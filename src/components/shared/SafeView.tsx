import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ViewProps } from "tamagui";
import { View } from "tamagui";

const SafeView = (properties: ViewProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      flex={1}
      paddingTop={insets.top}
      paddingLeft={insets.left}
      paddingRight={insets.right}
      paddingBottom={insets.bottom}
      {...properties}
    />
  );
};

export default SafeView;
