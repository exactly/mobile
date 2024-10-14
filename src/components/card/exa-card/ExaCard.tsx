import React, { useState } from "react";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import { YStack } from "tamagui";

import CardContents from "./CardContents";
import ModeSelector from "./ModeSelector";
import View from "../../shared/View";

export default function ExaCard() {
  const [isCredit, setIsCredit] = useState(true);
  const rIsCredit = useSharedValue(true);
  const rIsExpanded = useSharedValue(false);

  function toggleMode() {
    runOnJS(setIsCredit)(!rIsCredit.value);
    rIsCredit.value = !rIsCredit.value;
    if (!rIsCredit.value) {
      rIsExpanded.value = false;
    }
  }

  return (
    <YStack width="100%" borderRadius="$r4" borderWidth={0} maxHeight={280}>
      <View zIndex={3} backgroundColor="black" borderColor="black" borderRadius="$r4" borderWidth={1} overflow="hidden">
        <CardContents isCredit={isCredit} />
      </View>
      <View
        zIndex={2}
        borderColor={isCredit ? "$cardCreditBorder" : "$cardDebitBorder"}
        borderRadius="$r4"
        borderWidth={1}
        borderTopLeftRadius={0}
        borderTopRightRadius={0}
        onPress={toggleMode}
        marginTop={-20}
      >
        <ModeSelector isCredit={isCredit} />
      </View>
    </YStack>
  );
}
