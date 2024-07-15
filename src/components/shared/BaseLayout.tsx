import React from "react";
import { moderateScale } from "react-native-size-matters";
import { View } from "tamagui";

interface SafeViewProperties {
  children: React.ReactNode;
}

const BaseLayout = ({ children }: SafeViewProperties) => {
  return (
    <View flex={1} paddingHorizontal={moderateScale(10)}>
      {children}
    </View>
  );
};

export default BaseLayout;
