import { createAnimations } from "@tamagui/animations-moti";
import { config } from "@tamagui/config/v3";
import { createFont, createTamagui, createTokens } from "tamagui";

const tokens = createTokens({
  color: {
    creditDark1: "#18111B",
    creditDark5: "#48295C",
    creditDark9: "#8E4EC6",
    creditLight1: "#FEFCFE",
    creditLight5: "#EAD5F9",
    creditLight9: "#8E4EC6",
    debitDark1: "#0D141F",
    debitDark5: "#154467",
    debitDark9: "#7CE2FE",
    debitLight1: "#F9FEFF",
    debitLight5: "#BEE7F5",
    debitLight9: "#7CE2FE",
    debitLight12: "#1D3E56",
    feedbackErrorDark1: "#191111",
    feedbackErrorDark10: "#EC5D5E",
    feedbackErrorDark11: "#FF9592",
    feedbackErrorDark12: "#FFD1D9",
    feedbackErrorDark2: "#201314",
    feedbackErrorDark3: "#3B1219",
    feedbackErrorDark4: "#500F1C",
    feedbackErrorDark5: "#611623",
    feedbackErrorDark6: "#72232D",
    feedbackErrorDark7: "#8C333A",
    feedbackErrorDark8: "#B54548",
    feedbackErrorDark9: "#E5484D",
    feedbackErrorLight1: "#FFFCFC",
    feedbackErrorLight10: "#DC3E42",
    feedbackErrorLight11: "#CE2C31",
    feedbackErrorLight12: "#641723",
    feedbackErrorLight2: "#FFF7F7",
    feedbackErrorLight3: "#FEEBEC",
    feedbackErrorLight4: "#FFDBDC",
    feedbackErrorLight5: "#FFCDCE",
    feedbackErrorLight6: "#FDBDBE",
    feedbackErrorLight7: "#F4A9AA",
    feedbackErrorLight8: "#EB8E90",
    feedbackErrorLight9: "#E5484D",
    feedbackInformationDark1: "#0D1520",
    feedbackInformationDark10: "#3B9EFF",
    feedbackInformationDark11: "#70B8FF",
    feedbackInformationDark12: "#C2E6FF",
    feedbackInformationDark2: "#111927",
    feedbackInformationDark3: "#0D2847",
    feedbackInformationDark4: "#003362",
    feedbackInformationDark5: "#004074",
    feedbackInformationDark6: "#104D87",
    feedbackInformationDark7: "#205D9E",
    feedbackInformationDark8: "#2870BD",
    feedbackInformationDark9: "#0090FF",
    feedbackInformationLight1: "#FBFDFF",
    feedbackInformationLight10: "#0588F0",
    feedbackInformationLight11: "#0D74CE",
    feedbackInformationLight12: "#113264",
    feedbackInformationLight2: "#F4FAFF",
    feedbackInformationLight3: "#E6F4FE",
    feedbackInformationLight4: "#D5EFFF",
    feedbackInformationLight5: "#C2E5FF",
    feedbackInformationLight6: "#ACD8FC",
    feedbackInformationLight7: "#8EC8F6",
    feedbackInformationLight8: "#5EB1EF",
    feedbackInformationLight9: "#0090FF",
    feedbackSuccessDark1: "#0E1512",
    feedbackSuccessDark10: "#33B074",
    feedbackSuccessDark11: "#3DD68C",
    feedbackSuccessDark12: "#B1F1CB",
    feedbackSuccessDark2: "#121B17",
    feedbackSuccessDark3: "#132D21",
    feedbackSuccessDark4: "#113B29",
    feedbackSuccessDark5: "#174933",
    feedbackSuccessDark6: "#20573E",
    feedbackSuccessDark7: "#28684A",
    feedbackSuccessDark8: "#2F7C57",
    feedbackSuccessDark9: "#30A46C",
    feedbackSuccessLight1: "#FBFEFC",
    feedbackSuccessLight10: "#2B9A66",
    feedbackSuccessLight11: "#218358",
    feedbackSuccessLight12: "#193B2D",
    feedbackSuccessLight2: "#F4FBF6",
    feedbackSuccessLight3: "#E6F6EB",
    feedbackSuccessLight4: "#D6F1DF",
    feedbackSuccessLight5: "#C4E8D1",
    feedbackSuccessLight6: "#ADDDC0",
    feedbackSuccessLight7: "#8ECEAA",
    feedbackSuccessLight8: "#5BB98B",
    feedbackSuccessLight9: "#30A46C",
    feedbackWarningDark1: "#17120E",
    feedbackWarningDark10: "#FF801F",
    feedbackWarningDark11: "#FFA057",
    feedbackWarningDark12: "#FFE0C2",
    feedbackWarningDark2: "#1E160F",
    feedbackWarningDark3: "#331E0B",
    feedbackWarningDark4: "#462100",
    feedbackWarningDark5: "#562800",
    feedbackWarningDark6: "#66350C",
    feedbackWarningDark7: "#7E451D",
    feedbackWarningDark8: "#A35829",
    feedbackWarningDark9: "#F76B15",
    feedbackWarningLight1: "#FEFCFB",
    feedbackWarningLight10: "#EF5F00",
    feedbackWarningLight11: "#CC4E00",
    feedbackWarningLight12: "#582D1D",
    feedbackWarningLight2: "#FFF7ED",
    feedbackWarningLight3: "#FFEFD6",
    feedbackWarningLight4: "#FFDFB5",
    feedbackWarningLight5: "#FFD19A",
    feedbackWarningLight6: "#FFC182",
    feedbackWarningLight7: "#F5AE73",
    feedbackWarningLight8: "#EC9455",
    feedbackWarningLight9: "#F76B15",
    grayscaleDark1: "#101211",
    grayscaleDark10: "#717D79",
    grayscaleDark11: "#ADB5B2",
    grayscaleDark12: "#ECEEED",
    grayscaleDark2: "#171918",
    grayscaleDark3: "#202221",
    grayscaleDark4: "#272A29",
    grayscaleDark5: "#2E3130",
    grayscaleDark6: "#373B39",
    grayscaleDark7: "#444947",
    grayscaleDark8: "#5B625F",
    grayscaleDark9: "#63706B",
    grayscaleLight1: "#FBFDFC",
    grayscaleLight10: "#7C8481",
    grayscaleLight11: "#5F6563",
    grayscaleLight12: "#1A211E",
    grayscaleLight2: "#F7F9F8",
    grayscaleLight3: "#EEF1F0",
    grayscaleLight4: "#E6E9E8",
    grayscaleLight5: "#DFE2E0",
    grayscaleLight6: "#D7DAD9",
    grayscaleLight7: "#CBCFCD",
    grayscaleLight8: "#B8BCBA",
    grayscaleLight9: "#868E8B",
    primaryAltDark1: "#0D1514",
    primaryAltDark10: "#0EB39E",
    primaryAltDark11: "#0BD8B6",
    primaryAltDark12: "#ADF0DD",
    primaryAltDark2: "#111C1B",
    primaryAltDark3: "#0D2D2A",
    primaryAltDark4: "#023B37",
    primaryAltDark5: "#084843",
    primaryAltDark6: "#145750",
    primaryAltDark7: "#1C6961",
    primaryAltDark8: "#207E73",
    primaryAltDark9: "#12A594",
    primaryAltLight1: "#FAFEFD",
    primaryAltLight10: "#0D9B8A",
    primaryAltLight11: "#008573",
    primaryAltLight12: "#0D3D38",
    primaryAltLight2: "#F3FBF9",
    primaryAltLight3: "#E0F8F3",
    primaryAltLight4: "#CCF3EA",
    primaryAltLight5: "#B8EAE0",
    primaryAltLight6: "#A1DED2",
    primaryAltLight7: "#83CDC1",
    primaryAltLight8: "#53B9AB",
    primaryAltLight9: "#12A594",
    primaryDark1: "#0D1514",
    primaryDark10: "#0EB39E",
    primaryDark11: "#0BD8B6",
    primaryDark12: "#ADF0DD",
    primaryDark2: "#111C1B",
    primaryDark3: "#0D2D2A",
    primaryDark4: "#023B37",
    primaryDark5: "#084843",
    primaryDark6: "#145750",
    primaryDark7: "#1C6961",
    primaryDark8: "#207E73",
    primaryDark9: "#12A594",
    primaryLight1: "#FAFEFD",
    primaryLight10: "#0D9B8A",
    primaryLight11: "#008573",
    primaryLight12: "#0D3D38",
    primaryLight2: "#F3FBF9",
    primaryLight3: "#E0F8F3",
    primaryLight4: "#CCF3EA",
    primaryLight5: "#B8EAE0",
    primaryLight6: "#A1DED2",
    primaryLight7: "#83CDC1",
    primaryLight8: "#53B9AB",
    primaryLight9: "#12A594",
  },
  space: {
    s0: 0,
    true: 0,
    s1: 2,
    s2: 4,
    s2_5: 6,
    s3: 8,
    s3_5: 12,
    s4: 16,
    s4_5: 20,
    s5: 24,
    s6: 32,
    s7: 40,
    s8: 48,
    s9: 64,
    s10: 104,
    s11: 120,
    s12: 144,
    s13: 160,
    s14: 184,
  },
  radius: { r0: 0, true: 4, r1: 2, r2: 4, r3: 8, r4: 12, r5: 16, r6: 20, r_0: 9999 },
  size: config.tokens.size,
  zIndex: config.tokens.zIndex,
});

const body = createFont({
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

const tamagui = createTamagui({
  ...config,
  tokens,
  fonts: {
    body,
    heading: body,
    mono: createFont({
      family: "IBMPlexMono-Medm",
      face: { 500: { normal: "IBMPlexMono-Medm" } },
      weight: { medium: 500 },
      size: config.fonts.mono.size,
    }),
  },
  animations: createAnimations({
    bouncy: { type: "spring", damping: 9, mass: 0.9, stiffness: 150 },
    lazy: { type: "spring", damping: 18, stiffness: 50 },
    slow: { type: "spring", damping: 15, stiffness: 40 },
    moderate: { type: "spring", damping: 15, mass: 0.2, stiffness: 100 },
    quick: { type: "spring", damping: 25, mass: 1.2, stiffness: 250 },
    tooltip: { type: "spring", damping: 10, mass: 0.9, stiffness: 100 },
  }),
  settings: { ...config.settings, fastSchemeChange: false },
  themes: {
    light: {
      cardDebitBackground: tokens.color.debitLight1,
      cardDebitInteractive: tokens.color.debitLight9,
      cardDebitText: tokens.color.debitLight12,
      cardDebitBorder: tokens.color.debitLight5,
      cardCreditBackground: tokens.color.creditLight1,
      cardCreditInteractive: tokens.color.creditLight9,
      cardCreditText: tokens.color.creditLight1,
      cardCreditBorder: tokens.color.creditLight5,
      backgroundSoft: tokens.color.grayscaleLight1,
      backgroundMild: tokens.color.grayscaleLight2,
      backgroundStrong: tokens.color.grayscaleLight3,
      backgroundInverse: tokens.color.grayscaleDark2,
      backgroundBrand: tokens.color.primaryLight9,
      backgroundBrandSoft: tokens.color.primaryLight2,
      backgroundBrandMild: tokens.color.primaryLight3,
      uiNeutralPrimary: tokens.color.grayscaleLight12,
      uiNeutralSecondary: tokens.color.grayscaleLight11,
      uiNeutralTertiary: tokens.color.grayscaleLight3,
      uiNeutralPlaceholder: tokens.color.grayscaleLight9,
      uiNeutralInversePrimary: tokens.color.grayscaleLight1,
      uiNeutralInverseSecondary: tokens.color.grayscaleLight3,
      uiBrandPrimary: tokens.color.primaryLight11,
      uiBrandSecondary: tokens.color.primaryLight9,
      uiBrandTertiary: tokens.color.primaryLight7,
      uiSuccessPrimary: tokens.color.feedbackSuccessLight11,
      uiSuccessSecondary: tokens.color.feedbackSuccessLight9,
      uiSuccessTertiary: tokens.color.feedbackSuccessLight7,
      uiErrorPrimary: tokens.color.feedbackErrorLight11,
      uiErrorSecondary: tokens.color.feedbackErrorLight9,
      uiErrorTertiary: tokens.color.feedbackErrorLight7,
      uiWarningPrimary: tokens.color.feedbackWarningLight11,
      uiWarningSecondary: tokens.color.feedbackWarningLight9,
      uiWarningTertiary: tokens.color.feedbackWarningLight7,
      uiInfoPrimary: tokens.color.feedbackInformationLight11,
      uiInfoSecondary: tokens.color.feedbackInformationLight9,
      uiInfoTertiary: tokens.color.feedbackInformationLight7,
      interactiveBaseBrandDefault: tokens.color.primaryLight9,
      interactiveBaseBrandHover: tokens.color.primaryLight10,
      interactiveBaseBrandPressed: tokens.color.primaryLight11,
      interactiveBaseBrandSoftDefault: tokens.color.primaryLight3,
      interactiveBaseBrandSoftHover: tokens.color.primaryLight4,
      interactiveBaseBrandSoftPressed: tokens.color.primaryLight5,
      interactiveBaseSuccessDefault: tokens.color.feedbackSuccessLight9,
      interactiveBaseSuccessHover: tokens.color.feedbackSuccessLight10,
      interactiveBaseSuccessPressed: tokens.color.feedbackSuccessLight11,
      interactiveBaseSuccessSoftDefault: tokens.color.feedbackSuccessLight3,
      interactiveBaseSuccessSoftHover: tokens.color.feedbackSuccessLight4,
      interactiveBaseSuccessSoftPressed: tokens.color.feedbackSuccessLight5,
      interactiveBaseErrorDefault: tokens.color.feedbackErrorLight9,
      interactiveBaseErrorHover: tokens.color.feedbackErrorLight10,
      interactiveBaseErrorPressed: tokens.color.feedbackErrorLight11,
      interactiveBaseErrorSoftDefault: tokens.color.feedbackErrorLight3,
      interactiveBaseErrorSoftHover: tokens.color.feedbackErrorLight4,
      interactiveBaseErrorSoftPressed: tokens.color.feedbackErrorLight5,
      interactiveBaseWarningDefault: tokens.color.feedbackWarningLight9,
      interactiveBaseWarningHover: tokens.color.feedbackWarningLight10,
      interactiveBaseWarningPressed: tokens.color.feedbackWarningLight11,
      interactiveBaseWarningSoftDefault: tokens.color.feedbackWarningLight3,
      interactiveBaseWarningSoftHover: tokens.color.feedbackWarningLight4,
      interactiveBaseWarningSoftPressed: tokens.color.feedbackWarningLight5,
      interactiveBaseInformationDefault: tokens.color.feedbackInformationLight9,
      interactiveBaseInformationHover: tokens.color.feedbackInformationLight10,
      interactiveBaseInformationPressed: tokens.color.feedbackInformationLight11,
      interactiveBaseInformationSoftDefault: tokens.color.feedbackInformationLight3,
      interactiveBaseInformationSoftHover: tokens.color.feedbackInformationLight4,
      interactiveBaseInformationSoftPressed: tokens.color.feedbackInformationLight5,
      interactiveOnBaseBrandDefault: tokens.color.primaryLight3,
      interactiveOnBaseBrandSoft: tokens.color.primaryLight9,
      interactiveOnBaseSuccessDefault: tokens.color.feedbackSuccessLight3,
      interactiveOnBaseSuccessSoft: tokens.color.feedbackSuccessLight9,
      interactiveOnBaseErrorDefault: tokens.color.feedbackErrorLight3,
      interactiveOnBaseErrorSoft: tokens.color.feedbackErrorLight9,
      interactiveOnBaseWarningDefault: tokens.color.feedbackWarningLight3,
      interactiveOnBaseWarningSoft: tokens.color.feedbackWarningLight9,
      interactiveOnBaseInformationDefault: tokens.color.feedbackInformationLight3,
      interactiveOnBaseInformationSoft: tokens.color.feedbackInformationLight9,
      interactiveTextDisabled: tokens.color.grayscaleLight8,
      interactiveTextBrandDefault: tokens.color.primaryLight9,
      interactiveTextBrandHover: tokens.color.primaryLight10,
      interactiveTextBrandPressed: tokens.color.primaryLight11,
      interactiveTextSuccessDefault: tokens.color.feedbackSuccessLight9,
      interactiveTextSuccessHover: tokens.color.feedbackSuccessLight10,
      interactiveTextSuccessPressed: tokens.color.feedbackSuccessLight11,
      interactiveTextErrorDefault: tokens.color.feedbackErrorLight9,
      interactiveTextErrorHover: tokens.color.feedbackErrorLight10,
      interactiveTextErrorPressed: tokens.color.feedbackErrorLight11,
      interactiveTextWarningDefault: tokens.color.feedbackWarningLight9,
      interactiveTextWarningHover: tokens.color.feedbackWarningLight10,
      interactiveTextWarningPressed: tokens.color.feedbackWarningLight11,
      interactiveTextInfoDefault: tokens.color.feedbackInformationLight9,
      interactiveTextInfoHover: tokens.color.feedbackInformationLight10,
      interactiveTextInfoPressed: tokens.color.feedbackInformationLight11,
      interactiveDisabled: tokens.color.grayscaleLight4,
      interactiveOnDisabled: tokens.color.grayscaleLight8,
      borderNeutralSoft: tokens.color.grayscaleLight4,
      borderNeutralMild: tokens.color.grayscaleLight5,
      borderNeutralStrong: tokens.color.grayscaleLight6,
      borderNeutralSeparator: tokens.color.grayscaleLight5,
      borderNeutralDisabled: tokens.color.grayscaleLight8,
      borderBrandSoft: tokens.color.primaryLight4,
      borderBrandMild: tokens.color.primaryLight5,
      borderBrandStrong: tokens.color.primaryLight6,
      iconPrimary: tokens.color.grayscaleLight12,
      iconSecondary: tokens.color.grayscaleLight11,
      iconInversePrimary: tokens.color.grayscaleLight1,
      iconInverseSecondary: tokens.color.grayscaleLight2,
      iconSuccessSoft: tokens.color.feedbackSuccessLight1,
      iconSuccessDefault: tokens.color.feedbackSuccessLight9,
      iconSuccessHover: tokens.color.feedbackSuccessLight10,
      iconBrandDefault: tokens.color.primaryLight9,
      iconSuccessPressed: tokens.color.feedbackSuccessLight11,
      iconErrorSoft: tokens.color.feedbackErrorLight1,
      iconErrorDefault: tokens.color.feedbackErrorLight9,
      iconBrandHover: tokens.color.primaryLight10,
      iconBrandPressed: tokens.color.primaryLight11,
      iconErrorHover: tokens.color.feedbackErrorLight10,
      iconErrorPressed: tokens.color.feedbackErrorLight11,
      iconBrandSoftDefault: tokens.color.primaryLight3,
      iconBrandSoftHover: tokens.color.primaryLight4,
      iconBrandSoftPressed: tokens.color.primaryLight5,
      iconDisabled: tokens.color.grayscaleLight8,
      borderSuccessSoft: tokens.color.feedbackSuccessLight4,
      borderSuccessMild: tokens.color.feedbackSuccessLight5,
      borderSuccessStrong: tokens.color.feedbackSuccessLight6,
      borderErrorSoft: tokens.color.feedbackErrorLight4,
      borderErrorMild: tokens.color.feedbackErrorLight5,
      borderErrorStrong: tokens.color.feedbackErrorLight6,
      borderWarningSoft: tokens.color.feedbackWarningLight4,
      borderWarningMild: tokens.color.feedbackWarningLight5,
      borderWarningStrong: tokens.color.feedbackWarningLight6,
      borderInformationSoft: tokens.color.feedbackInformationLight4,
      borderInformationMild: tokens.color.feedbackInformationLight5,
      borderInformationStrong: tokens.color.feedbackInformationLight6,
    },
    dark: {
      cardDebitBackground: tokens.color.debitDark1,
      cardDebitInteractive: tokens.color.debitDark9,
      cardDebitText: tokens.color.debitLight12,
      cardDebitBorder: tokens.color.debitDark5,
      cardCreditBackground: tokens.color.creditDark1,
      cardCreditInteractive: tokens.color.creditDark9,
      cardCreditText: tokens.color.creditLight1,
      cardCreditBorder: tokens.color.creditDark5,
      backgroundSoft: tokens.color.grayscaleDark2,
      backgroundMild: tokens.color.grayscaleDark1,
      backgroundStrong: tokens.color.grayscaleDark3,
      backgroundInverse: tokens.color.grayscaleLight2,
      backgroundBrand: tokens.color.primaryDark9,
      backgroundBrandSoft: tokens.color.primaryDark2,
      backgroundBrandMild: tokens.color.primaryDark3,
      uiNeutralPrimary: tokens.color.grayscaleDark12,
      uiNeutralSecondary: tokens.color.grayscaleDark11,
      uiNeutralTertiary: tokens.color.grayscaleDark3,
      uiNeutralPlaceholder: tokens.color.grayscaleDark9,
      uiNeutralInversePrimary: tokens.color.grayscaleDark1,
      uiNeutralInverseSecondary: tokens.color.grayscaleDark4,
      uiBrandPrimary: tokens.color.primaryDark11,
      uiBrandSecondary: tokens.color.primaryDark9,
      uiBrandTertiary: tokens.color.primaryDark7,
      uiSuccessPrimary: tokens.color.feedbackSuccessDark11,
      uiSuccessSecondary: tokens.color.feedbackSuccessDark9,
      uiSuccessTertiary: tokens.color.feedbackSuccessDark7,
      uiErrorPrimary: tokens.color.feedbackErrorDark11,
      uiErrorSecondary: tokens.color.feedbackErrorDark9,
      uiErrorTertiary: tokens.color.feedbackErrorDark7,
      uiWarningPrimary: tokens.color.feedbackWarningDark11,
      uiWarningSecondary: tokens.color.feedbackWarningDark9,
      uiWarningTertiary: tokens.color.feedbackWarningDark7,
      uiInfoPrimary: tokens.color.feedbackInformationDark11,
      uiInfoSecondary: tokens.color.feedbackInformationLight9,
      uiInfoTertiary: tokens.color.feedbackInformationDark7,
      interactiveBaseBrandDefault: tokens.color.primaryDark9,
      interactiveBaseBrandHover: tokens.color.primaryDark10,
      interactiveBaseBrandPressed: tokens.color.primaryDark11,
      interactiveBaseBrandSoftDefault: tokens.color.primaryDark3,
      interactiveBaseBrandSoftHover: tokens.color.primaryDark4,
      interactiveBaseBrandSoftPressed: tokens.color.primaryDark5,
      interactiveBaseSuccessDefault: tokens.color.feedbackSuccessDark9,
      interactiveBaseSuccessHover: tokens.color.feedbackSuccessLight10,
      interactiveBaseSuccessPressed: tokens.color.feedbackSuccessLight11,
      interactiveBaseSuccessSoftDefault: tokens.color.feedbackSuccessDark3,
      interactiveBaseSuccessSoftHover: tokens.color.feedbackSuccessDark4,
      interactiveBaseSuccessSoftPressed: tokens.color.feedbackSuccessDark5,
      interactiveBaseErrorDefault: tokens.color.feedbackErrorDark9,
      interactiveBaseErrorHover: tokens.color.feedbackErrorDark10,
      interactiveBaseErrorPressed: tokens.color.feedbackErrorDark11,
      interactiveBaseErrorSoftDefault: tokens.color.feedbackErrorDark3,
      interactiveBaseErrorSoftHover: tokens.color.feedbackErrorDark4,
      interactiveBaseErrorSoftPressed: tokens.color.feedbackErrorDark5,
      interactiveBaseWarningDefault: tokens.color.feedbackWarningDark9,
      interactiveBaseWarningHover: tokens.color.feedbackWarningDark10,
      interactiveBaseWarningPressed: tokens.color.feedbackWarningDark11,
      interactiveBaseWarningSoftDefault: tokens.color.feedbackWarningDark3,
      interactiveBaseWarningSoftHover: tokens.color.feedbackWarningDark4,
      interactiveBaseWarningSoftPressed: tokens.color.feedbackWarningDark5,
      interactiveBaseInformationDefault: tokens.color.feedbackInformationDark9,
      interactiveBaseInformationHover: tokens.color.feedbackInformationDark10,
      interactiveBaseInformationPressed: tokens.color.feedbackInformationDark11,
      interactiveBaseInformationSoftDefault: tokens.color.feedbackInformationDark3,
      interactiveBaseInformationSoftHover: tokens.color.feedbackInformationDark4,
      interactiveBaseInformationSoftPressed: tokens.color.feedbackInformationDark5,
      interactiveOnBaseBrandDefault: tokens.color.primaryDark3,
      interactiveOnBaseBrandSoft: tokens.color.primaryDark9,
      interactiveOnBaseSuccessDefault: tokens.color.feedbackSuccessDark3,
      interactiveOnBaseSuccessSoft: tokens.color.feedbackSuccessDark9,
      interactiveOnBaseErrorDefault: tokens.color.feedbackErrorDark3,
      interactiveOnBaseErrorSoft: tokens.color.feedbackErrorDark9,
      interactiveOnBaseWarningDefault: tokens.color.feedbackWarningDark3,
      interactiveOnBaseWarningSoft: tokens.color.feedbackWarningDark9,
      interactiveOnBaseInformationDefault: tokens.color.feedbackInformationDark3,
      interactiveOnBaseInformationSoft: tokens.color.feedbackInformationDark9,
      interactiveTextDisabled: tokens.color.grayscaleDark8,
      interactiveTextBrandDefault: tokens.color.primaryDark9,
      interactiveTextBrandHover: tokens.color.primaryDark10,
      interactiveTextBrandPressed: tokens.color.primaryDark11,
      interactiveTextSuccessDefault: tokens.color.feedbackSuccessDark9,
      interactiveTextSuccessHover: tokens.color.feedbackSuccessDark10,
      interactiveTextSuccessPressed: tokens.color.feedbackSuccessDark11,
      interactiveTextErrorDefault: tokens.color.feedbackErrorDark9,
      interactiveTextErrorHover: tokens.color.feedbackErrorDark10,
      interactiveTextErrorPressed: tokens.color.feedbackErrorDark11,
      interactiveTextWarningDefault: tokens.color.feedbackWarningDark9,
      interactiveTextWarningHover: tokens.color.feedbackWarningDark10,
      interactiveTextWarningPressed: tokens.color.feedbackWarningDark11,
      interactiveTextInfoDefault: tokens.color.feedbackInformationDark9,
      interactiveTextInfoHover: tokens.color.feedbackInformationLight10,
      interactiveTextInfoPressed: tokens.color.feedbackInformationDark11,
      interactiveDisabled: tokens.color.grayscaleDark4,
      interactiveOnDisabled: tokens.color.grayscaleDark8,
      borderNeutralSoft: tokens.color.grayscaleDark4,
      borderNeutralMild: tokens.color.grayscaleDark5,
      borderNeutralStrong: tokens.color.grayscaleDark6,
      borderNeutralSeparator: tokens.color.grayscaleDark5,
      borderNeutralDisabled: tokens.color.grayscaleDark8,
      borderBrandSoft: tokens.color.primaryDark4,
      borderBrandMild: tokens.color.primaryDark5,
      borderBrandStrong: tokens.color.primaryDark6,
      iconPrimary: tokens.color.grayscaleDark12,
      iconSecondary: tokens.color.grayscaleDark11,
      iconInversePrimary: tokens.color.grayscaleDark1,
      iconInverseSecondary: tokens.color.grayscaleDark2,
      iconSuccessSoft: tokens.color.feedbackSuccessDark1,
      iconSuccessDefault: tokens.color.feedbackSuccessDark9,
      iconSuccessHover: tokens.color.feedbackSuccessDark10,
      iconBrandDefault: tokens.color.primaryDark9,
      iconSuccessPressed: tokens.color.feedbackSuccessDark11,
      iconErrorSoft: tokens.color.feedbackErrorDark1,
      iconErrorDefault: tokens.color.feedbackErrorDark9,
      iconBrandHover: tokens.color.primaryDark10,
      iconBrandPressed: tokens.color.primaryDark11,
      iconErrorHover: tokens.color.feedbackErrorDark10,
      iconErrorPressed: tokens.color.feedbackErrorDark11,
      iconBrandSoftDefault: tokens.color.primaryDark3,
      iconBrandSoftHover: tokens.color.primaryDark4,
      iconBrandSoftPressed: tokens.color.primaryDark5,
      iconDisabled: tokens.color.grayscaleDark8,
      borderSuccessSoft: tokens.color.feedbackSuccessDark4,
      borderSuccessMild: tokens.color.feedbackSuccessDark5,
      borderSuccessStrong: tokens.color.feedbackSuccessDark6,
      borderErrorSoft: tokens.color.feedbackErrorDark4,
      borderErrorMild: tokens.color.feedbackErrorDark5,
      borderErrorStrong: tokens.color.feedbackErrorDark6,
      borderWarningSoft: tokens.color.feedbackWarningDark4,
      borderWarningMild: tokens.color.feedbackWarningDark5,
      borderWarningStrong: tokens.color.feedbackWarningDark6,
      borderInformationSoft: tokens.color.feedbackInformationDark4,
      borderInformationMild: tokens.color.feedbackInformationDark5,
      borderInformationStrong: tokens.color.feedbackInformationDark6,
    },
  },
});

export type Config = typeof tamagui;
declare module "tamagui" {
  interface TamaguiCustomConfig extends Config {}
}
export default tamagui;
