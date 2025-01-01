module.exports = /** @type {string} */ (
  process.env.EXPO_PUBLIC_DOMAIN || process.env.APP_DOMAIN || "sandbox.exactly.app" // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing -- ignore empty string
);
