import { Stack } from "expo-router";
import React from "react";

export default function AddFundsLayout() {
  return (
    <Stack initialRouteName="method" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="method" />
    </Stack>
  );
}
