import { config } from "@tamagui/config/v3";
import { createTamagui, createTokens } from "tamagui";

import theme, { BDOGrotesk, IBMPlexMono } from "./src/utils/theme";

const customTokens = createTokens({ ...config.tokens, color: { ...theme } });

const tamaguiConfig = createTamagui({
  ...config,
  defaultFont: "body",
  defaultProps: {
    color: "uiPrimary",
  },
  tokens: { ...customTokens },
  fonts: {
    heading: BDOGrotesk,
    body: BDOGrotesk,
    mono: IBMPlexMono,
  },
});

export type Config = typeof tamaguiConfig;
export default tamaguiConfig;
