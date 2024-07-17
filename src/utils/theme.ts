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

export interface AppColors {
  backgroundBrand: string;
  backgroundBrandMild: string;
  backgroundBrandSoft: string;
  backgroundSoft: string;
  borderBrandSoft: string;
  borderMild: string;
  borderNavigation: string;
  borderSeparator: string;
  borderSoft: string;
  brandMild: string;
  interactiveBaseBrandHover: string;
  interactiveBaseBrandSoftDefault: string;
  interactiveBaseBrandSoftHover: string;
  interactiveBaseBrandSoftPressed: string;
  interactiveBaseSuccessDefault: string;
  interactiveDisabled: string;
  interactiveOnBrandDefault: string;
  interactiveOnBrandSoft: string;
  interactiveTextBrandDefault: string;
  interactiveTextPlaceholder: string;
  textBrandPrimary: string;
  textPrimary: string;
  textSecondary: string;
  textSuccessPrimary: string;
  textSuccessSecondary: string;
  textTextBrand: string;
  white: string;
  // TODO review usage of colors above
  backgroundMild: string;
  borderNeutralSoft: string;
  interactiveBaseBrandDefault: string;
  interactiveBaseBrandPressed: string;
  textInteractiveBaseBrandDefault: string;
  textInteractiveBaseBrandSoftDefault: string;
  uiBrandSecondary: string;
  uiDarkGrey: string;
  uiNeutralPlaceholder: string;
  uiPrimary: string;
  uiSecondary: string;
  uiSuccessSecondary: string;
}

const lightTheme: AppColors = {
  backgroundBrand: "#12A594",
  backgroundBrandMild: "#E0F8F3",
  backgroundBrandSoft: "#F3FBF9",
  backgroundMild: "#F7F9F8",
  backgroundSoft: "#FBFDFC",
  borderBrandSoft: "#CCF3EA",
  borderMild: "#DFE2E0",
  borderNavigation: "#E6E9E8",
  borderNeutralSoft: "#E6E9E8",
  borderSeparator: "#DFE2E0",
  borderSoft: "#E6E9E8",
  brandMild: "#E0F8F3",
  interactiveBaseBrandDefault: "#12A594",
  interactiveBaseBrandHover: "#0D9B8A",
  interactiveBaseBrandPressed: "#008573",
  interactiveBaseBrandSoftDefault: "#E0F8F3",
  interactiveBaseBrandSoftHover: "#CCF3EA",
  interactiveBaseBrandSoftPressed: "#B8EAE0",
  interactiveBaseSuccessDefault: "#30A46C",
  interactiveDisabled: "#E6E9E8",
  interactiveOnBrandDefault: "#E0F8F3",
  interactiveOnBrandSoft: "#12A594",
  interactiveTextBrandDefault: "#12A594",
  interactiveTextPlaceholder: "#868E8B",
  textBrandPrimary: "#008573",
  textInteractiveBaseBrandDefault: "#E0F8F3",
  textInteractiveBaseBrandSoftDefault: "#12A594",
  textPrimary: "#1A211E",
  textSecondary: "#5F6563",
  textSuccessPrimary: "#218358",
  textSuccessSecondary: "#30A46C",
  textTextBrand: "#12A594",
  uiBrandSecondary: "#12A594",
  uiDarkGrey: "#343330",
  uiNeutralPlaceholder: "#868E8B",
  uiPrimary: "#1A211E",
  uiSecondary: "#5F6563",
  uiSuccessSecondary: "#30A46C",
  white: "#FFFFFF",
};

export default lightTheme;
