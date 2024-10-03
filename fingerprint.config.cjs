/** @type {import('expo-updates/fingerprint').Config} */
module.exports = {
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
  ignorePaths: [".gitignore", "package.json", "patches/eslint-*", "src/generated/versionCode.js"],
};
