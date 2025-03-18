import { useQuery } from "@tanstack/react-query";
import React from "react";
import { XStack, YStack } from "tamagui";

import Text from "../../shared/Text";
import View from "../../shared/View";

const steps = Array.from({ length: 3 }, (_, index) => index);

export default function Progression() {
  const { data: step } = useQuery<number | undefined>({ queryKey: ["card-upgrade"] });
  const remainingSteps = steps.length - (step ?? 0);
  return (
    <YStack gap="$s3_5">
      <XStack width="100%" justifyContent="space-between" gap="$s2">
        {steps.map((_, index) => (
          <View
            key={index}
            flex={1}
            height={8}
            backgroundColor={index > (step ?? 0) - 1 ? "$uiBrandTertiary" : "$uiBrandSecondary"}
            borderRadius="$r4"
          />
        ))}
      </XStack>
      <Text color="$uiBrandTertiary" subHeadline>
        {`${remainingSteps} step${remainingSteps === 1 ? "" : "s"} remaining`}
      </Text>
    </YStack>
  );
}
