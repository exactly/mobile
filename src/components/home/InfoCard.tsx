import React from "react";
import { View } from "tamagui";

import Text from "../shared/Text";

interface InfoCardProperties {
  title: string;
  children?: React.ReactNode;
  renderAction?: React.ReactNode;
}

export default function InfoCard({ children, title, renderAction }: InfoCardProperties) {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s4">
      <View flexDirection="row" gap="$s3" alignItems="center" justifyContent="space-between">
        <Text emphasized headline flex={1}>
          {title}
        </Text>
        {renderAction}
      </View>
      {children}
    </View>
  );
}
