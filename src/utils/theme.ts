import { config } from "@tamagui/config/v3";
import { createFont } from "tamagui";

export const BDOGrotesk = createFont({
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

export const IBMPlexMono = createFont({
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

export interface AppColors {
  white: string;
  interactiveOnBrandDefault: string;
  interactiveTextBrandDefault: string;
  interactiveTextPlaceholder: string;
  textTextBrand: string;
  interactiveDisabled: string;
  textBrandPrimary: string;
  borderMild: string;
  borderBrandSoft: string;
  brandMild: string;
  textPrimary: string;
  interactiveOnBrandSoft: string;
  textSecondary: string;
  backgroundBrand: string;
  interactiveBaseSuccessDefault: string;
  interactiveBaseBrandHover: string;
  interactiveBaseBrandSoftDefault: string;
  interactiveBaseBrandSoftHover: string;
  interactiveBaseBrandSoftPressed: string;
  textSuccessSecondary: string;
  backgroundSoft: string;
  backgroundMild: string;
  borderSoft: string;
  backgroundBrandMild: string;
  textSuccessPrimary: string;
  backgroundBrandSoft: string;
  borderSeparator: string;
  borderNavigation: string;
  // TODO review usage of colors above
  uiPrimary: string;
  uiSecondary: string;
  uiNeutralPlaceholder: string;
  borderNeutralSoft: string;
  uiBrandSecondary: string;
  uiSuccessSecondary: string;
  interactiveBaseBrandDefault: string;
  textInteractiveBaseBrandDefault: string;
  textInteractiveBaseBrandSoftDefault: string;
  interactiveBaseBrandPressed: string;
  uiDarkGrey: string;
}

const lightTheme: AppColors = {
  white: "#FFFFFF",
  interactiveOnBrandDefault: "#E0F8F3",
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
  interactiveBaseBrandSoftHover: "#CCF3EA",
  interactiveBaseBrandSoftPressed: "#B8EAE0",
  textSuccessSecondary: "#30A46C",
  backgroundMild: "#F7F9F8",
  borderSoft: "#E6E9E8",
  backgroundBrandMild: "#E0F8F3",
  textSuccessPrimary: "#218358",
  backgroundBrandSoft: "#F3FBF9",
  borderSeparator: "#DFE2E0",
  borderNavigation: "#E6E9E8",
  uiPrimary: "#1A211E",
  uiSecondary: "#5F6563",
  uiNeutralPlaceholder: "#868E8B",
  backgroundSoft: "#FBFDFC",
  borderNeutralSoft: "#E6E9E8",
  uiBrandSecondary: "#12A594",
  uiSuccessSecondary: "#30A46C",
  interactiveBaseBrandDefault: "#12A594",
  textInteractiveBaseBrandDefault: "#E0F8F3",
  interactiveBaseBrandSoftDefault: "#E0F8F3",
  textInteractiveBaseBrandSoftDefault: "#12A594",
  interactiveBaseBrandPressed: "#008573",
  uiDarkGrey: "#343330",
};

export default lightTheme;
