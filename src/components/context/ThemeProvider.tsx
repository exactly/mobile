import React from "react";
import { Appearance } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  return (
    <TamaguiProvider config={tamagui} defaultTheme={Appearance.getColorScheme() ?? "light"}>
      {children}
    </TamaguiProvider>
  );
}
