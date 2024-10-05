import type { ViewProps } from "tamagui";

import { styled, View } from "tamagui";

export interface ViewProperties extends ViewProps {
  fullScreen?: boolean;
  padded?: boolean;
  smallPadding?: boolean;
  tab?: boolean;
}

export default styled(View, {
  variants: {
    fullScreen: { true: { height: "100%", width: "100%" } },
    padded: { true: { padding: "$s5" } },
    smallPadding: { true: { padding: "$s3" } },
    tab: { true: { paddingBottom: 0 } },
  },
});
