/** @type {import('@babel/core').ConfigFunction} */
module.exports = function config(api) {
  /** @type {(ever: boolean) => void} */ (/** @type {unknown} */ (api.cache))(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [["@tamagui/babel-plugin", { components: ["tamagui"], config: "tamagui.config.ts", logTimings: true }]],
  };
};
