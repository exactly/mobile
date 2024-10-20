import React from "react";
import { Appearance } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <TamaguiProvider config={tamagui} defaultTheme={Appearance.getColorScheme() ?? "light"}>
      {children}
    </TamaguiProvider>
  );
}
