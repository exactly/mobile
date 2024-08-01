import React from "react";
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
      contained
      main
      spaced
      {...rest}
      iconAfter={isLoading ? <Spinner color="$interactiveOnBaseBrandDefault" /> : rest.iconAfter}
    >
      {isLoading ? loadingContent : (rest.children ?? rest.content)}
    </Button>
  );
}
