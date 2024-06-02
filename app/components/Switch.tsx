import React from "react";
import { Switch as TamaguiSwitch, type SwitchProps } from "tamagui";

export default function Switch(properties: SwitchProps) {
  return (
    <TamaguiSwitch padding="3px" backgroundColor="#AAA">
      <TamaguiSwitch.Thumb animation="quicker" backgroundColor="white" width="24px" height="24px" />
    </TamaguiSwitch>
  );
}
