import type { ReactNode } from "react";
import React from "react";
import type { ButtonProps } from "tamagui";
import { Button as TamaguiButton, View } from "tamagui";

export default function Button(
  properties: ButtonProps & {
    actionIcon?: ReactNode;
    secondary?: boolean;
  },
) {
  const styleProperties = properties.secondary
    ? {
        backgroundColor: "$interactiveBaseBrandSoftDefault",
        pressStyle: {
          backgroundColor: "$interactiveBaseBrandSoftPressed",
        },
        hoverStyle: {
          backgroundColor: "$interactiveBaseBrandSoftHover",
          borderColor: "$interactiveBaseBrandSoftHover",
        },
        color: "$interactiveBaseBrandDefault",
      }
    : {
        backgroundColor: "$interactiveBaseBrandDefault",
        pressStyle: {
          backgroundColor: "$interactiveBaseBrandPressed",
        },
        hoverStyle: {
          backgroundColor: "$interactiveBaseBrandHover",
          borderColor: "$interactiveBaseBrandHover",
        },
        color: "$interactiveOnBrandDefault",
      };

  return (
    <TamaguiButton
      {...styleProperties}
      borderRadius="$md"
      fontSize="15px"
      fontWeight="600"
      padding="20px"
      justifyContent="space-between"
      height="60px"
      alignItems="center"
      {...properties}
    >
      {properties.children}
      <View>{properties.actionIcon}</View>
    </TamaguiButton>
  );
}
