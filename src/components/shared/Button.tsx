import { Button, styled } from "tamagui";

export default styled(Button, {
  flex: 1,
  fontWeight: "bold",
  defaultVariants: { contained: true, outlined: false },
  fontSize: 15,
  padding: "$s3",
  variants: {
    contained: {
      true: {
        backgroundColor: "$interactiveBaseBrandDefault",
        color: "$interactiveOnBaseBrandDefault",
        hoverStyle: { backgroundColor: "$interactiveBaseBrandHover" },
        pressStyle: { backgroundColor: "$interactiveBaseBrandPressed" },
      },
    },
    outlined: {
      true: {
        backgroundColor: "$interactiveBaseBrandSoftDefault",
        color: "$interactiveOnBaseBrandSoft",
        borderColor: "$borderBrandSoft",
        hoverStyle: { backgroundColor: "$interactiveBaseBrandSoftHover" },
        pressStyle: {
          backgroundColor: "$interactiveBaseBrandSoftPressed",
          color: "$interactiveOnBaseBrandSoft",
        },
      },
    },
    disabled: {
      true: {
        backgroundColor: "$interactiveDisabled",
        color: "$interactiveOnDisabled",
        borderColor: "transparent",
      },
    },
  } as const,
});
