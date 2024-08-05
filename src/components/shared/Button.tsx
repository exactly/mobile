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
      true: {
        backgroundColor: "$interactiveDisabled",
        color: "$interactiveOnDisabled",
        borderColor: "transparent",
      },
    },
    main: {
      true: {
        borderColor: "transparent",
        fontSize: ms(15),
        fontWeight: 700,
        height: ms(64),
        padding: "$s4_5",
        borderRadius: "$r4",
        scaleIcon: 1.5,
        flex: 1,
        flexBasis: "50%",
        maxHeight: ms(64),
      },
    },
    spaced: {
      true: {
        spaceFlex: true,
        alignItems: "center",
      },
    },
    noFlex: {
      true: {
        flex: 0,
        flexBasis: "auto",
      },
    },
    fullwidth: {
      true: {
        width: "100%",
      },
    },
  } as const,
});
