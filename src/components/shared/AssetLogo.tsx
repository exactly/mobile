import React from "react";
import { SvgUri, type UriProps } from "react-native-svg";

import View from "./View";

export default function AssetLogo({ ...properties }: UriProps) {
  return (
    <View borderRadius="$r_0" overflow="hidden">
      <SvgUri {...properties} />
    </View>
  );
}
