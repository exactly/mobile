import React from "react";
import { ms } from "react-native-size-matters";
import type { ViewProps } from "tamagui";
import { View } from "tamagui";

const BaseLayout = (properties: ViewProps) => {
  return <View paddingHorizontal={ms(20)} {...properties} />;
};

export default BaseLayout;
