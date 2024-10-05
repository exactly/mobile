import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ViewProperties } from "./View";

import View from "./View";

interface SafeViewProperties extends ViewProperties {
  children: React.ReactNode;
}

export default function SafeView({ children, ...rest }: SafeViewProperties) {
  const { bottom, left, right, top } = useSafeAreaInsets();
  return (
    <View
      backgroundColor="$backgroundMild"
      paddingBottom={bottom}
      paddingLeft={left}
      paddingRight={right}
      paddingTop={top}
      {...rest}
    >
      {children}
    </View>
  );
}
