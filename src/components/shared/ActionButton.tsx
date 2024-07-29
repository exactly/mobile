import React from "react";
import { ms } from "react-native-size-matters";
import { Spinner, type ButtonProps } from "tamagui";

import Button from "./Button";

interface ActionButtonProperties extends ButtonProps {
  isLoading?: boolean;
  loadingContent?: string;
}

export default function ActionButton({
  isLoading = false,
  loadingContent = "Loading...",
  ...rest
}: ActionButtonProperties) {
  return (
    <Button
      borderRadius="$r3"
      contained
      height={ms(64)}
      iconAfter={isLoading ? <Spinner /> : rest.iconAfter}
      minHeight={ms(64)}
      padding="$s4_5"
      scaleIcon={1.5}
      spaceFlex
      {...rest}
    >
      {isLoading ? loadingContent : (rest.children ?? rest.content)}
    </Button>
  );
}
