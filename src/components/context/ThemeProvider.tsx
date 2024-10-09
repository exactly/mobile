import React from "react";
import { useColorScheme } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export type AppTheme = "light" | "dark" | "system";

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const systemTheme = useColorScheme();
  return (
    <TamaguiProvider config={tamagui} defaultTheme={systemTheme ?? "light"}>
      {children}
    </TamaguiProvider>
  );
}
