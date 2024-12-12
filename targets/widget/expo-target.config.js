/** @type {import('@bacons/apple-targets/build/config').ConfigFunction} */
// eslint-disable-next-line unicorn/prefer-module, unicorn/no-anonymous-default-export
module.exports = ({ ios }) => ({
  type: "widget",
  icon: "../../src/assets/icon-ios.png",
  colors: { slate: { light: "#F0F0F0", dark: "#3E72A0" }, $accent: "#F09458", $widgetBackground: "#DB739C" },
  entitlements: {
    "com.apple.security.application-groups": ios?.entitlements?.["com.apple.security.application-groups"], // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    // @ts-expect-error -- missing in type
    "keychain-access-groups": ios?.entitlements?.["keychain-access-groups"], // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  },
});
