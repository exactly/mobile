import { config } from "@tamagui/config/v3";
import { createFont, createTamagui, createTokens } from "tamagui";

import { color, radius, space, themes } from "./src/utils/theme";

const tokens = createTokens({ color, space, radius, size: config.tokens.size, zIndex: config.tokens.zIndex });

const BDOGrotesk = createFont({
  family: "BDOGrotesk-Regular",
  face: {
    600: { normal: "BDOGrotesk-Bold" },
    700: { normal: "BDOGrotesk-Bold" },
    bold: { normal: "BDOGrotesk-Bold" },
    normal: { normal: "BDOGrotesk-Regular" },
  },
  size: config.fonts.body.size,
  weight: { 600: 600, 700: 700 },
});

const IBMPlexMono = createFont({
  family: "IBMPlexMono-Regular",
  face: {
    600: { normal: "IBMPlexMono-SemiBold" },
    700: { normal: "IBMPlexMono-Bold" },
    bold: { normal: "IBMPlexMono-Bold" },
    normal: { normal: "IBMPlexMono-Regular" },
  },
  size: config.fonts.mono.size,
  weight: { 600: 600, 700: 700 },
});

const tamaguiConfig = createTamagui({
  ...config,
  defaultFont: "body",
  defaultProps: { color: "uiPrimary" },
  tokens,
  themes,
  fonts: { heading: BDOGrotesk, body: BDOGrotesk, mono: IBMPlexMono },
});

export type Config = typeof tamaguiConfig;
export default tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Config {}
}
