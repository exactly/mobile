import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ViewProperties } from "./View";
import View from "./View";

interface SafeViewProperties extends ViewProperties {
  children: React.ReactNode;
}

export default function SafeView({ children, ...rest }: SafeViewProperties) {
  const { top, bottom, left, right } = useSafeAreaInsets();
  return (
    <View
      paddingTop={top}
      paddingBottom={bottom}
      paddingLeft={left}
      paddingRight={right}
      backgroundColor="$backgroundMild"
      {...rest}
    >
      {children}
    </View>
  );
}
