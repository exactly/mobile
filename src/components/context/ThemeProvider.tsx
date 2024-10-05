import { useMutation, useQuery } from "@tanstack/react-query";
import React, { createContext } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

interface ThemeContextState {
  setTheme: (theme: AppTheme) => void;
  theme: AppTheme;
}

export const ThemeContext = createContext<ThemeContextState>({ setTheme: () => undefined, theme: "system" });

interface ThemeProviderProperties {
  children: React.ReactNode;
}

export type AppTheme = "dark" | "light" | "system";

export default function ThemeProvider({ children }: ThemeProviderProperties) {
  const { data: theme } = useQuery<AppTheme>({ initialData: "system", queryKey: ["settings", "theme"] });
  const systemTheme = useColorScheme();

  const { mutate: setTheme } = useMutation({
    mutationFn: (value: AppTheme) => {
      if (Platform.OS !== "web") Appearance.setColorScheme(value === "system" ? null : value);
      queryClient.setQueryData<AppTheme>(["settings", "theme"], value);
      return Promise.resolve(true);
    },
    onError: handleError,
  });

  return (
    <ThemeContext.Provider value={{ setTheme, theme }}>
      <TamaguiProvider config={tamagui} defaultTheme={theme === "system" ? (systemTheme ?? "light") : theme}>
        {children}
      </TamaguiProvider>
    </ThemeContext.Provider>
  );
}
