import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View } from "tamagui";

import PasskeyUtils from "./PasskeyUtils";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

export default function Payments() {
  return (
    <SafeView>
      <ScrollView>
        <BaseLayout flex={1}>
          <View gap={ms(20)}>
            <Text fontSize={40} fontFamily="$mono" fontWeight="bold">
              Payments
            </Text>
            <PasskeyUtils />
          </View>
        </BaseLayout>
      </ScrollView>
    </SafeView>
  );
}
