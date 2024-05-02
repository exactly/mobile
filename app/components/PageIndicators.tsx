import React from "react";
import { Button, XStack } from "tamagui";

const ActivePageIndicator = () => (
  <Button height="4px" width="24px" padding={0} backgroundColor="$interactiveBaseBrandDefault" borderRadius="4px" />
);

const InactivePageIndicator = () => (
  <Button height="4px" width="8px" padding={0} backgroundColor="$interactiveDisabled" borderRadius="4px" />
);

export default function PageIndicators() {
  return (
    <XStack marginBottom="40px" gap="4px">
      <ActivePageIndicator />
      <InactivePageIndicator />
      <InactivePageIndicator />
      <InactivePageIndicator />
    </XStack>
  );
}
