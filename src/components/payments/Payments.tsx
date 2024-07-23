import React from "react";
import { ms } from "react-native-size-matters";
import { Button, Text, View } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

const pressStyle = { backgroundColor: "$interactiveBaseBrandDefault", opacity: 0.9 };

const pay = () => {
  /// TODO implement payment logic
};

export default function Payments() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View gap={ms(40)}>
          <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
            Payments
          </Text>
          <Button
            borderRadius="$r2"
            variant="outlined"
            backgroundColor="$interactiveBaseBrandDefault"
            color="$interactiveOnBaseBrandDefault"
            onPress={pay}
            fontWeight={600}
            pressStyle={pressStyle}
          >
            Pay Now
          </Button>
        </View>
      </BaseLayout>
    </SafeView>
  );
}
