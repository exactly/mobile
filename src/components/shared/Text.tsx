import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { Text as TamaguiText, styled } from "tamagui";

const StyledText = styled(TamaguiText, {
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
    title2: {
      true: {
        fontSize: ms(22),
        lineHeight: ms(28),
        letterSpacing: ms(-0.2),
      },
    },
    title3: {
      true: {
        fontSize: ms(20),
        lineHeight: ms(25),
        letterSpacing: ms(-0.2),
      },
    },
    headline: {
      true: {
        fontSize: ms(17),
        lineHeight: ms(23),
        letterSpacing: ms(-0.2),
      },
    },
    body: {
      true: {
        fontSize: ms(17),
        lineHeight: ms(23),
        letterSpacing: ms(-0.2),
      },
    },
    callout: {
      true: {
        fontSize: ms(16),
        lineHeight: ms(21),
        letterSpacing: ms(-0.2),
      },
    },
    subHeadline: {
      true: {
        fontSize: ms(15),
        lineHeight: ms(21),
        letterSpacing: ms(-0.2),
      },
    },
    footnote: {
      true: {
        fontSize: ms(13),
        lineHeight: ms(18),
        letterSpacing: ms(-0.2),
      },
    },
    caption: {
      true: {
        fontSize: ms(12),
        lineHeight: ms(16),
        letterSpacing: ms(-0.2),
      },
    },
    caption2: {
      true: {
        fontSize: ms(11),
        lineHeight: ms(14),
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
    pill: {
      true: {
        fontWeight: "bold",
        paddingHorizontal: ms(4),
        paddingVertical: ms(2),
        borderRadius: "$r2",
      },
    },
    strikeThrough: {
      true: {
        textDecorationLine: "line-through",
      },
    },
  } as const,
});

interface TextProperties extends React.ComponentPropsWithoutRef<typeof StyledText> {
  sensitive?: boolean;
}

export default function Text({ children, sensitive, ...rest }: TextProperties) {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  return <StyledText {...rest}>{sensitive && hidden ? "***" : children}</StyledText>;
}
