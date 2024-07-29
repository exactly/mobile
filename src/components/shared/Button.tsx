import { ms } from "react-native-size-matters";
import { Button, styled } from "tamagui";

export default styled(Button, {
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
    main: {
      true: {
        height: ms(64),
        padding: "$s4_5",
        borderRadius: "$r4",
        scaleIcon: 1.5,
        flex: 1,
        flexBasis: "50%",
      },
    },
    spaced: {
      true: {
        spaceFlex: true,
      },
    },
  } as const,
});
