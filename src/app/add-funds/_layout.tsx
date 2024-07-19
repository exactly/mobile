import { Stack } from "expo-router";
import React from "react";

export default function AddFundsLayout() {
  return (
    <Stack initialRouteName="start" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="start" />
    </Stack>
  );
}
