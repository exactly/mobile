import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import React from "react";

export function App() {
  // @ts-expect-error
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
