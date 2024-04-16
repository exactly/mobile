const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

/** @type {import('metro-config').InputConfigT} */
module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...(config.resolver?.sourceExts ?? []), "mjs"],
    blockList: [
      ...(Array.isArray(config.resolver?.blockList) ? config.resolver.blockList : [config.resolver?.blockList]),
      new RegExp(`${__dirname}/contracts/`),
    ],
    extraNodeModules: {
      buffer: require.resolve("@craftzdog/react-native-buffer"),
      crypto: require.resolve("react-native-quick-crypto"),
      stream: require.resolve("stream-browserify"),
    },
  },
};
