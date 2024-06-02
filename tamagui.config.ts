import { config } from "@tamagui/config/v2";
import { createFont, createTamagui, createTokens } from "tamagui";

const tokens = createTokens({
  color: {
    interactiveOnBrandDefault: "#E0F8F3",
    interactiveBaseBrandDefault: "#12A594",
    interactiveTextBrandDefault: "#12A594",
    interactiveTextPlaceholder: "#868E8B",
    textTextBrand: "#12A594",
    interactiveDisabled: "#E6E9E8",
    textBrandPrimary: "#008573",
    borderMild: "#DFE2E0",
    borderBrandSoft: "#CCF3EA",
    brandMild: "#E0F8F3",
    textPrimary: "#1A211E",
    interactiveOnBrandSoft: "#12A594",
    textSecondary: "#5F6563",
    backgroundBrand: "#12A594",
    interactiveBaseSuccessDefault: "#30A46C",
    interactiveBaseBrandHover: "#0D9B8A",
    interactiveBaseBrandPressed: "#008573",
    interactiveBaseBrandSoftDefault: "#E0F8F3",
    interactiveBaseBrandSoftHover: "#CCF3EA",
    interactiveBaseBrandSoftPressed: "#B8EAE0",
    textSuccessSecondary: "#30A46C",
    backgroundSoft: "#FBFDFC",
    backgroundMild: "#F7F9F8",
    borderSoft: "#E6E9E8",
    backgroundBrandMild: "#E0F8F3",
    textSuccessPrimary: "#218358",
    backgroundBrandSoft: "#F3FBF9",
    borderSeparator: "#DFE2E0",
  },
  size: {
    sm: 38,
    md: 46,
    true: 46,
    lg: 60,
  },
  space: {
    sm: 15,
    md: 20,
    true: 20,
  },
  radius: {
    sm: 4,
    md: 8,
    true: 8,
    lg: 12,
    full: 9999,
  },
  zIndex: {
    sm: 1,
    md: 2,
    true: 2,
    lg: 3,
  },
});

export default createTamagui({
  ...config,
  tokens: {
    ...config.tokens,
    ...tokens,
  },

  fonts: {
    body: createFont({
      family: "BDOGrotesk",
      face: {
        "200": { normal: "BDOGrotesk_Light" },
        "400": { normal: "BDOGrotesk_Regular" },
        "600": { normal: "BDOGrotesk_Medium" },
        "700": { normal: "BDOGrotesk_Bold" },
        bold: { normal: "BDOGrotesk_Bold" },
        normal: { normal: "BDOGrotesk_Regular" },
      },
      size: {
        1: 12,
        2: 14,
        3: 15,
      },
    }),
  },
});
