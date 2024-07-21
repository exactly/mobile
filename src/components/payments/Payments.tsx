import React from "react";
import { Text } from "tamagui";

import BaseLayout from "../shared/BaseLayout.js";
import SafeView from "../shared/SafeView.js";

const Payments = () => {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
          Payments
        </Text>
      </BaseLayout>
    </SafeView>
  );
};

export default Payments;
