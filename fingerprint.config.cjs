/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  sourceSkips: ["ExpoConfigAll", "GitIgnore", "PackageJsonScriptsAll"],
  ignorePaths: ["package.json", "patches/eslint-*", "src/generated/versionCode.js"],
};
