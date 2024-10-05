/** @type {import('@babel/core').ConfigFunction} */
module.exports = function config(api) {
  /** @type {(ever: boolean) => void} */ (/** @type {unknown} */ (api.cache))(true);
  return {
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
          components: ["tamagui"],
          config: "tamagui.config.ts",
          disableExtraction: process.env.NODE_ENV === "development",
          logTimings: true,
        },
      ],
      "react-native-reanimated/plugin",
    ],
    presets: ["babel-preset-expo"],
  };
};
