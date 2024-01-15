/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  /** @type {(ever: boolean) => void} */ (/** @type {unknown} */ (api.cache))(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "expo-router/babel",
      "transform-inline-environment-variables",
      ["@babel/plugin-transform-private-methods", { loose: true }],
      ["@tamagui/babel-plugin", { components: ["tamagui"], config: "tamagui.config.ts", logTimings: true }],
      ["module-resolver", { alias: { "@turnkey/api-key-stamper": "@turnkey/api-key-stamper/dist/index.js" } }],
    ],
  };
};
