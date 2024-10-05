import { ms } from "react-native-size-matters";
import { Button, styled } from "tamagui";

export default styled(Button, {
  defaultVariants: { contained: true },
  fontSize: 15,
  fontWeight: "bold",
  minHeight: "auto",
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
    disabled: {
      true: { backgroundColor: "$interactiveDisabled", borderColor: "transparent", color: "$interactiveOnDisabled" },
    },
    fullwidth: { true: { width: "100%" } },
    halfWidth: { true: { flexBasis: "50%" } },
    main: {
      true: {
        borderColor: "transparent",
        borderRadius: "$r4",
        flex: 1,
        fontSize: ms(15),
        fontWeight: 700,
        height: ms(68),
        maxHeight: ms(68),
        padding: "$s4_5",
        scaleIcon: 1.5,
      },
    },
    noFlex: { true: { flex: 0, flexBasis: "auto" } },
    outlined: {
      true: {
        backgroundColor: "$interactiveBaseBrandSoftDefault",
        borderColor: "$borderBrandSoft",
        color: "$interactiveOnBaseBrandSoft",
        hoverStyle: { backgroundColor: "$interactiveBaseBrandSoftHover" },
        pressStyle: {
          backgroundColor: "$interactiveBaseBrandSoftPressed",
          color: "$interactiveOnBaseBrandSoft",
        },
      },
    },
    spaced: { true: { alignItems: "center", spaceFlex: true } },
  } as const,
});
