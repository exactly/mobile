import { Stack } from "expo-router";
import React from "react";

export default function PayLayout() {
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false, presentation: "modal" }} />;
}
