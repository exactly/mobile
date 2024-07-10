const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

/** @type {import('metro-config').InputConfigT} */
module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    extraNodeModules: {
      crypto: require.resolve("react-native-quick-crypto"),
    },
  },
};
