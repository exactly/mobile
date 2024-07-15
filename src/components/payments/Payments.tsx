import React from "react";
import { Text } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

const Payments = () => {
  return (
    <SafeView>
      <BaseLayout>
        <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
          Payments
        </Text>
      </BaseLayout>
    </SafeView>
  );
};

export default Payments;
