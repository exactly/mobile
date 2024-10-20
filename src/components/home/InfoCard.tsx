import React, { type ReactNode } from "react";
import { View } from "tamagui";

import Text from "../shared/Text";

export default function InfoCard({
  children,
  title,
  renderAction,
}: {
  title: string;
  children?: ReactNode;
  renderAction?: ReactNode;
}) {
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
