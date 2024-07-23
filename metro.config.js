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
  },
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  },
};
