import React, { type ReactNode } from "react";
import { Appearance } from "react-native";
import { TamaguiProvider } from "tamagui";

import tamagui from "../../../tamagui.config";
import NotificationToast from "../shared/Toast";
import SafeToastViewport from "../shared/ToastViewport";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <TamaguiProvider config={tamagui} defaultTheme={Appearance.getColorScheme() ?? "light"}>
      {children}
      <NotificationToast />
      <SafeToastViewport />
    </TamaguiProvider>
  );
}
