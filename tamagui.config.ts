import { config } from "@tamagui/config/v2";
import { createFont, createTamagui } from "tamagui";

const bdoGroteskFont = createFont({
  family: "BDOGrotesk",
  face: {
    600: { normal: "BDOGroteskBold" },
    700: { normal: "BDOGroteskBold" },
    bold: { normal: "BDOGroteskBold" },
    normal: { normal: "BDOGroteskRegular" },
  },
  size: config.fonts.body.size,
  weight: {
    600: 600,
    700: 700,
  },
});

const ibmPlexMonoFont = createFont({
  family: "IBMPlexMono",
  face: {
    600: { normal: "IBMPlexMonoSemiBold" },
    700: { normal: "IBMPlexMonoBold" },
    bold: { normal: "IBMPlexMonoBold" },
    normal: { normal: "IBMPlexMonoRegular" },
  },
  size: config.fonts.mono.size,
  weight: {
    600: 600,
    700: 700,
  },
});

export default createTamagui({
  ...config,
  defaultFont: "body",
  tokens: {
    ...config.tokens,
  },
  fonts: {
    heading: bdoGroteskFont,
    body: bdoGroteskFont,
    mono: ibmPlexMonoFont,
  },
});
