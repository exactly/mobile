import { ms } from "react-native-size-matters";
import { Text, styled } from "tamagui";

export default styled(Text, {
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
  } as const,
});
