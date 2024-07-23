import React from "react";
import { Text } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

export default function Payments() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
          Payments
        </Text>
      </BaseLayout>
    </SafeView>
  );
}
