import { useMutation, useQuery } from "@tanstack/react-query";
import React, { createContext } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
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

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const { data: theme } = useQuery<AppTheme>({ queryKey: ["settings", "theme"], initialData: "system" });
  const systemTheme = useColorScheme();

  const { mutate: setTheme } = useMutation({
    mutationFn: (value: AppTheme) => {
      if (Platform.OS !== "web") {
        Appearance.setColorScheme(value === "system" ? null : value); // eslint-disable-line unicorn/no-null
      }
      queryClient.setQueryData<AppTheme>(["settings", "theme"], value);
      return Promise.resolve(true);
    },
    onError: handleError,
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <TamaguiProvider config={tamagui} defaultTheme={theme === "system" ? (systemTheme ?? "light") : theme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  );
}
