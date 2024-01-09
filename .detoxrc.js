/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: { $0: "jest", config: "e2e/jest.config.js" },
    jest: { setupTimeout: 120000 },
  },
  logger: { level: process.env.CI && "debug" },
  artifacts: {
    plugins: { log: process.env.CI && "failing", screenshot: "failing" },
  },
  apps: {
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build: "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      reversePorts: [8081],
    },
    "android.release": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/release/app-release.apk",
      build: "cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release",
    },
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/exactly.app",
      build:
        "xcodebuild -workspace ios/exactly.xcworkspace -scheme exactly -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Release-iphonesimulator/exactly.app",
      build:
        "xcodebuild -workspace ios/exactly.xcworkspace -scheme exactly -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
  devices: {
    attached: { type: "android.attached", device: { adbName: ".*" } },
    emulator: { type: "android.emulator", device: { avdName: "Pixel_3a_API_30_x86" } },
    simulator: { type: "ios.simulator", device: { type: "iPhone 15" } },
  },
  configurations: {
    "android.att.debug": { device: "attached", app: "android.debug" },
    "android.att.release": { device: "attached", app: "android.release" },
    "android.emu.debug": { device: "emulator", app: "android.debug" },
    "android.emu.release": { device: "emulator", app: "android.release" },
    "ios.sim.debug": { device: "simulator", app: "ios.debug" },
    "ios.sim.release": { device: "simulator", app: "ios.release" },
  },
};
