const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('metro-config').InputConfigT} */
module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...(defaultConfig.resolver?.sourceExts ?? []), "mjs", "svg"],
    assetExts: defaultConfig.resolver.assetExts.filter((extension) => extension !== "svg"),
    blockList: [
      ...(Array.isArray(defaultConfig.resolver?.blockList)
        ? defaultConfig.resolver.blockList
        : [defaultConfig.resolver?.blockList]),
      new RegExp(`${__dirname}/contracts/`),
    ],
    extraNodeModules: {
      buffer: require.resolve("@craftzdog/react-native-buffer"),
      crypto: require.resolve("react-native-quick-crypto"),
      stream: require.resolve("stream-browserify"),
    },
  },
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  },
};
