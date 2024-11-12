import React from "react";
import { Spinner } from "tamagui";

import Button from "./Button";

export default function ActionButton({
  isLoading = false,
  loadingContent = "Loading...",
  ...rest
}: React.ComponentProps<typeof Button> & { isLoading?: boolean; loadingContent?: string }) {
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
