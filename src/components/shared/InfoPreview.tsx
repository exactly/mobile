import React from "react";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Text from "../shared/Text";

interface InfoPreviewProperties {
  title: string;
  children?: React.ReactNode;
  renderAction?: React.ReactNode;
}

export default function InfoPreview({ children, title, renderAction }: InfoPreviewProperties) {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding={ms(20)} gap={ms(20)}>
      <View flexDirection="row" gap={ms(10)} alignItems="center" justifyContent="space-between">
        <Text fontSize={17} fontWeight="bold" flex={1}>
          {title}
        </Text>
        {renderAction}
      </View>
      {children}
    </View>
  );
}
