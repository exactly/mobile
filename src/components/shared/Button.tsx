import { ms } from "react-native-size-matters";
import { Button, styled } from "tamagui";

export default styled(Button, {
  minHeight: "auto",
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
      true: { backgroundColor: "$interactiveDisabled", color: "$interactiveOnDisabled", borderColor: "transparent" },
    },
    main: {
      true: {
        flex: 1,
        borderColor: "transparent",
        fontSize: ms(15),
        fontWeight: 700,
        height: ms(68),
        padding: "$s4_5",
        borderRadius: "$r4",
        scaleIcon: 1.5,
        maxHeight: ms(68),
      },
    },
    spaced: { true: { spaceFlex: true, alignItems: "center" } },
    noFlex: { true: { flex: 0, flexBasis: "auto" } },
    fullwidth: { true: { width: "100%" } },
    halfWidth: { true: { flexBasis: "50%" } },
  } as const,
});
