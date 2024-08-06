import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import type { ThemeName } from "tamagui";
import { Theme } from "tamagui";

interface ThemeContextState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextState>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  const { theme, setTheme } = useContext(ThemeContext);
  function toggle() {
    setTheme(theme === "light" ? "dark" : "light");
  }
  return { theme, toggle };
}

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const scheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeName>(scheme === "dark" ? "dark" : "light");
  useEffect(() => {
    setTheme(scheme === "dark" ? "dark" : "light");
  }, [scheme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Theme name={theme}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
