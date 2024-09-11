/** @type {import('@babel/core').ConfigFunction} */
module.exports = function config(api) {
  /** @type {(ever: boolean) => void} */ (/** @type {unknown} */ (api.cache))(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@wagmi/core/codegen": "@wagmi/core/dist/esm/exports/codegen",
            "hono/client": "hono/dist/client",
          },
        },
      ],
      [
        "@tamagui/babel-plugin",
        {
          config: "tamagui.config.ts",
          components: ["tamagui"],
          disableExtraction: process.env.NODE_ENV === "development",
          logTimings: true,
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
