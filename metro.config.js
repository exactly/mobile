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
    assetExts: config.resolver?.assetExts?.filter((extension) => extension !== "svg"),
    sourceExts: [...(config.resolver?.sourceExts ?? []), "svg"],
    resolveRequest: (context, module, platform) =>
      context.resolveRequest(
        context,
        context.originModulePath.startsWith(`${__dirname}/common/`) && module.startsWith(".") && module.endsWith(".js")
          ? module.replace(/\.[^./]+$/, "")
          : module,
        platform,
      ),
    blockList: [
      ...((config.resolver?.blockList &&
        (Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList])) ??
        []),
      new RegExp(`${__dirname}/\\.\\w+/`),
      new RegExp(`${__dirname}/android/`),
      new RegExp(`${__dirname}/contracts/`),
      new RegExp(`${__dirname}/dist/`),
      new RegExp(`${__dirname}/ios/`),
      new RegExp(`${__dirname}/server/`),
    ],
  },
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  },
};
