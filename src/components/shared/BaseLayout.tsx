import React from "react";
import { ms } from "react-native-size-matters";
import type { ViewProps } from "tamagui";
import { View } from "tamagui";

export default function BaseLayout(properties: ViewProps) {
  return <View paddingHorizontal={ms(20)} {...properties} />;
}
