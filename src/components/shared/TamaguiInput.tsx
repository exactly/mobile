import type React from "react";

import { styled, withStaticProperties } from "tamagui";

import Input from "./Input";
import View from "./View";

const InputFrame = styled(View, {
  alignItems: "center",
  borderColor: "$borderNeutralMild",
  borderRadius: "$r2",
  borderWidth: 1,
  flexDirection: "row",
  focusStyle: { borderColor: "$borderBrandStrong" },
  focusVisibleStyle: { borderColor: "$borderBrandStrong", outlineColor: "$borderBrandStrong", outlineWidth: 0 },
  gap: "$s2",
  padding: "$s3",
});
const InputComponent = styled(Input, { flex: 1, padding: 0, unstyled: true });
function InputIcon({ children }: { children: React.ReactNode }) {
  return children;
}
export default withStaticProperties(InputFrame, { Icon: InputIcon, Input: InputComponent });
