/** @type {import('@bacons/apple-targets').Config} */
// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  type: "widget",
  icon: "../../src/assets/icon-ios.png",
  colors: { slate: { light: "#F0F0F0", dark: "#3E72A0" }, $accent: "#F09458", $widgetBackground: "#DB739C" },
  entitlements: { "com.apple.security.application-groups": ["group.app.exactly"] },
};
