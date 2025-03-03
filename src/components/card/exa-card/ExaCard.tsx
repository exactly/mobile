import { useQuery } from "@tanstack/react-query";
import React from "react";
import Animated from "react-native-reanimated";
import { YStack } from "tamagui";

import CardContents from "./CardContents";
import { getCard } from "../../../utils/server";
import View from "../../shared/View";

interface ExaCardProperties {
  disabled?: boolean;
  revealing: boolean;
  frozen: boolean;
}

export default function ExaCard({ disabled = false, revealing, frozen }: ExaCardProperties) {
  const { data: card } = useQuery({ queryKey: ["card", "details"], queryFn: getCard });

  const isDebit = card?.mode === 0;

  return (
    <AnimatedYStack width="100%" borderRadius="$r4" borderWidth={0}>
      <View zIndex={3} backgroundColor="black" borderColor="black" borderRadius="$r4" borderWidth={1} overflow="hidden">
        <CardContents isCredit={!isDebit} disabled={disabled} frozen={frozen} revealing={revealing} />
      </View>
    </AnimatedYStack>
  );
}

const AnimatedYStack = Animated.createAnimatedComponent(YStack);
