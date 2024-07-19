import { config } from "@tamagui/config/v3";
import { createFont } from "tamagui";

export const BDOGrotesk = createFont({
  family: "BDOGrotesk",
  face: {
    600: { normal: "BDOGrotesk-Bold" },
    700: { normal: "BDOGrotesk-Bold" },
    bold: { normal: "BDOGrotesk-Bold" },
    normal: { normal: "BDOGrotesk-Regular" },
  },
  size: config.fonts.body.size,
  weight: {
    600: 600,
    700: 700,
  },
});

export const IBMPlexMono = createFont({
  family: "IBMPlexMono",
  face: {
    600: { normal: "IBMPlexMono-SemiBold" },
    700: { normal: "IBMPlexMono-Bold" },
    bold: { normal: "IBMPlexMono-Bold" },
    normal: { normal: "IBMPlexMono-Regular" },
  },
  size: config.fonts.mono.size,
  weight: {
    600: 600,
    700: 700,
  },
});

const lightTheme = {
  backgroundBrand: "#12A594",
  backgroundBrandSoft: "#F3FBF9",
  borderBrandSoft: "#CCF3EA",
  borderMild: "#DFE2E0",
  borderNavigation: "#E6E9E8",
  borderSeparator: "#DFE2E0",
  borderSoft: "#E6E9E8",
  brandMild: "#E0F8F3",
  interactiveBaseBrandHover: "#0D9B8A",
  interactiveBaseBrandSoftDefault: "#E0F8F3",
  interactiveBaseBrandSoftHover: "#CCF3EA",
  interactiveBaseBrandSoftPressed: "#B8EAE0",
  interactiveBaseSuccessDefault: "#30A46C",
  interactiveOnBrandDefault: "#E0F8F3",
  interactiveOnBrandSoft: "#12A594",
  interactiveTextBrandDefault: "#12A594",
  interactiveTextPlaceholder: "#868E8B",
  textBrandPrimary: "#008573",
  textPrimary: "#1A211E",
  textSecondary: "#5F6563",
  textSuccessPrimary: "#218358",
  textSuccessSecondary: "#30A46C",
  white: "#FFFFFF",
  // TODO review usage of colors above
  backgroundDanger: "#FEEBEC",
  backgroundBrandMild: "#E0F8F3",
  backgroundMild: "#F7F9F8",
  backgroundSoft: "#FBFDFC",
  borderNeutralSoft: "#E6E9E8",
  iconBrand: "#12A594",
  iconPrimary: "#1A211E",
  iconSecondary: "#5F6563",
  interactiveBaseBrandDefault: "#12A594",
  interactiveBaseBrandPressed: "#008573",
  interactiveDisabled: "#E6E9E8",
  interactiveBaseErrorDefault: "#E5484D",
  interactiveOnBaseErrorSoft: "#E5484D",
  interactiveOnDisabled: "#B8BCBA",
  textBrand: "#12A594",
  textInteractiveBaseBrandDefault: "#E0F8F3",
  textInteractiveBaseBrandSoftDefault: "#12A594",
  uiBrandSecondary: "#12A594",
  uiDarkGrey: "#343330",
  uiNeutralPlaceholder: "#868E8B",
  uiErrorPrimary: "#CE2C31",
  uiPrimary: "#1A211E",
  uiSecondary: "#5F6563",
  uiSuccessPrimary: "#218358",
  uiSuccessSecondary: "#30A46C",
};

export default lightTheme;
