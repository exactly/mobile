const { extraErrorDataIntegration, init, sessionTimingIntegration } = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

init({
  release: require("@exactly/common/generated/release"),
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  tracesSampler: ({ attributes }) => (attributes?.["exa.ignore"] ? 0 : 1),
  profilesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  attachStacktrace: true,
  autoSessionTracking: true,
  normalizeDepth: 10,
  integrations: [nodeProfilingIntegration(), extraErrorDataIntegration({ depth: 10 }), sessionTimingIntegration()],
  spotlight: !process.env.APP_DOMAIN || process.env.APP_DOMAIN === "localhost",
});
