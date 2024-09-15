import { useQuery } from "@tanstack/react-query";
import { reloadAppAsync } from "expo";
import React, { createContext } from "react";
import { useColorScheme } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

interface ThemeContextState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const ThemeContext = createContext<ThemeContextState>({ theme: "system", setTheme: () => undefined });

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export type AppTheme = "light" | "dark" | "system";

function setTheme(theme: AppTheme) {
  queryClient.setQueryData<AppTheme>(["settings", "theme"], theme);
  reloadAppAsync().catch(handleError);
}

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const { data: theme } = useQuery<AppTheme>({ queryKey: ["settings", "theme"], initialData: "system" });
  const systemTheme = useColorScheme();
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <TamaguiProvider config={tamagui} defaultTheme={theme === "system" ? (systemTheme ?? "light") : theme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  );
}
