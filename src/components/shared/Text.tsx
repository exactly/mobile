import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { styled, Text as TamaguiText } from "tamagui";

const StyledText = styled(TamaguiText, {
  defaultVariants: { primary: true },
  variants: {
    body: { true: { fontSize: ms(17), letterSpacing: ms(-0.2), lineHeight: ms(23) } },
    brand: { true: { color: "$interactiveBaseBrandDefault" } },
    callout: { true: { fontSize: ms(16), letterSpacing: ms(-0.2), lineHeight: ms(21) } },
    caption: { true: { fontSize: ms(12), letterSpacing: ms(-0.2), lineHeight: ms(16) } },
    caption2: { true: { fontSize: ms(11), letterSpacing: ms(-0.2), lineHeight: ms(14) } },
    centered: { true: { textAlign: "center" } },
    emphasized: { true: { fontWeight: "bold" } },
    footnote: { true: { fontSize: ms(13), letterSpacing: ms(-0.2), lineHeight: ms(18) } },
    headline: { true: { fontSize: ms(17), letterSpacing: ms(-0.2), lineHeight: ms(23) } },
    pill: { true: { borderRadius: "$r2", fontWeight: "bold", paddingHorizontal: ms(4), paddingVertical: ms(2) } },
    primary: { true: { color: "$uiNeutralPrimary" } },
    secondary: { true: { color: "$uiNeutralSecondary" } },
    strikeThrough: { true: { textDecorationLine: "line-through" } },
    subHeadline: { true: { fontSize: ms(15), letterSpacing: ms(-0.2), lineHeight: ms(21) } },
    title: { true: { fontSize: ms(28), letterSpacing: ms(-0.2), lineHeight: ms(34) } },
    title2: { true: { fontSize: ms(22), letterSpacing: ms(-0.2), lineHeight: ms(28) } },
    title3: { true: { fontSize: ms(20), letterSpacing: ms(-0.2), lineHeight: ms(25) } },
  } as const,
});

interface TextProperties extends React.ComponentPropsWithoutRef<typeof StyledText> {
  sensitive?: boolean;
}

export default function Text({ children, sensitive, ...rest }: TextProperties) {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  return <StyledText {...rest}>{sensitive && hidden ? "***" : children}</StyledText>;
}
