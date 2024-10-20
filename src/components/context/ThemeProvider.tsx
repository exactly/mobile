import React, { type ReactNode } from "react";
import { Appearance } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <TamaguiProvider config={tamagui} defaultTheme={Appearance.getColorScheme() ?? "light"}>
      {children}
    </TamaguiProvider>
  );
}
