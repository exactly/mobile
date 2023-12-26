const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: [...(defaultConfig.resolver?.sourceExts ?? []), "mjs"],
    blockList: [
      ...(Array.isArray(defaultConfig.resolver?.blockList)
        ? defaultConfig.resolver.blockList
        : [defaultConfig.resolver?.blockList]),
      /\/contracts\/lib\//,
    ],
  },
};
