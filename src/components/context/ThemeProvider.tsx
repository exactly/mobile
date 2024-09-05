import { useQuery } from "@tanstack/react-query";
import React, { createContext, useEffect, useState } from "react";
import { Appearance, Platform, useColorScheme, type ColorSchemeName } from "react-native";
import type { ThemeName } from "tamagui";
import { Theme } from "tamagui";

import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

interface ThemeContextState {
  appearance: ColorSchemeName;
  setAppearance: (appearance: ColorSchemeName) => void;
  theme: ThemeName;
}

export const ThemeContext = createContext<ThemeContextState>({
  appearance: Appearance.getColorScheme(),
  theme: "light",
  setAppearance: () => undefined,
});

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const appearance = useColorScheme();
  const { data: theme } = useQuery<ColorSchemeName>({ queryKey: ["theme"] });
  const [tamaguiTheme, setTamaguiTheme] = useState<ThemeName>(theme ?? appearance ?? "light");

  function setAppearance(value: ColorSchemeName) {
    if (!value) queryClient.resetQueries({ queryKey: ["theme"] }).catch(handleError);
    queryClient.setQueryData<ColorSchemeName>(["theme"], value);
  }

  useEffect(() => {
    if (Platform.OS === "web") {
      setTamaguiTheme(theme ?? appearance ?? "light");
      return;
    }
    Appearance.setColorScheme(theme);
  }, [appearance, theme]);

  useEffect(() => {
    if (appearance !== null && appearance !== undefined) {
      setTamaguiTheme(appearance === "dark" ? "dark" : "light");
    }
  }, [appearance]);

  return (
    <ThemeContext.Provider value={{ appearance, setAppearance, theme: tamaguiTheme }}>
      <Theme name={tamaguiTheme}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
