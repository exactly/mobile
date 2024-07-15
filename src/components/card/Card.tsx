import React from "react";
import { Text } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

const Card = () => {
  return (
    <SafeView>
      <BaseLayout>
        <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
          Card
        </Text>
      </BaseLayout>
    </SafeView>
  );
};

export default Card;
