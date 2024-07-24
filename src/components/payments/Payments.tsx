import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

export default function Payments() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View gap={ms(40)}>
          <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
            Payments
          </Text>
        </View>
      </BaseLayout>
    </SafeView>
  );
}
