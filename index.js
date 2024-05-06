import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import React from "react";

export default function App() {
  // @ts-expect-error
  const context = require.context("./app");
  return <ExpoRoot context={context} />;
}

registerRootComponent(App);
