import { ms } from "react-native-size-matters";
import { Text, styled } from "tamagui";

export default styled(Text, {
  color: "$uiNeutralPrimary",
  variants: {
    emphasized: {
      true: {
        fontWeight: "bold",
      },
    },
    title: {
      true: {
        fontSize: ms(28),
        lineHeight: ms(34),
        letterSpacing: ms(-0.2),
      },
    },
    brand: {
      true: {
        color: "$interactiveBaseBrandDefault",
      },
    },
    centered: {
      true: {
        textAlign: "center",
      },
    },
    secondary: {
      true: {
        color: "$uiNeutralSecondary",
      },
    },
    pill: {
      true: {
        backgroundColor: "$interactiveBaseBrandDefault",
        color: "$interactiveBaseBrandSoftDefault",
        fontWeight: "bold",
        paddingHorizontal: ms(4),
        paddingVertical: ms(2),
        borderRadius: "$r2",
        alignSelf: "center",
      },
    },
  } as const,
});
