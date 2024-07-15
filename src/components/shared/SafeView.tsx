import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ViewProps } from "tamagui";
import { View } from "tamagui";

interface SafeViewProperties {
  children: React.ReactNode;
  ViewProps?: ViewProps;
}

const SafeView = ({ children, ViewProps }: SafeViewProperties) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      flex={1}
      paddingTop={insets.top}
      paddingLeft={insets.left}
      paddingRight={insets.right}
      paddingBottom={insets.bottom}
      {...ViewProps}
    >
      {children}
    </View>
  );
};

export default SafeView;
