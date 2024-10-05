import React from "react";
import { View } from "tamagui";

import Text from "../shared/Text";

interface InfoCardProperties {
  children?: React.ReactNode;
  renderAction?: React.ReactNode;
  title: string;
}

export default function InfoCard({ children, renderAction, title }: InfoCardProperties) {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" gap="$s4" padding="$s4">
      <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-between">
        <Text emphasized flex={1} headline>
          {title}
        </Text>
        {renderAction}
      </View>
      {children}
    </View>
  );
}
