/** @type {import('expo-updates/fingerprint').Config} */
module.exports = {
  ignorePaths: [".gitignore", "package.json", "patches/eslint-*", "src/generated/versionCode.js"],
  sourceSkips: [
    "ExpoConfigAndroidPackage",
    "ExpoConfigAssets",
    "ExpoConfigIosBundleIdentifier",
    "ExpoConfigNames",
    "ExpoConfigRuntimeVersionIfString",
    "ExpoConfigSchemes",
    "ExpoConfigVersions",
    "PackageJsonAndroidAndIosScriptsIfNotContainRun",
  ],
};
