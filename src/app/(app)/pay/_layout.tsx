import { Stack } from "expo-router";
import React from "react";

import useBackgroundColor from "../../../utils/useBackgroundColor";

export default function PayLayout() {
  useBackgroundColor();
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false, presentation: "modal" }} />;
}
