import type { ViewProps } from "tamagui";
import { styled, View } from "tamagui";

export interface ViewProperties extends ViewProps {
  padded?: boolean;
  fullScreen?: boolean;
  tab?: boolean;
  smallPadding?: boolean;
}

export default styled(View, {
  variants: {
    fullScreen: { true: { width: "100%", height: "100%" } },
    padded: { true: { padding: "$s5" } },
    tab: { true: { paddingBottom: 0 } },
    smallPadding: { true: { padding: "$s3" } },
  },
});
