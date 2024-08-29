import { Stack } from "expo-router";
import React from "react";

export default function AddFundsLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="asset" />
      <Stack.Screen name="amount" />
      <Stack.Screen
        name="review"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
