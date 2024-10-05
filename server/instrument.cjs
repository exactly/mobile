const { extraErrorDataIntegration, init, sessionTimingIntegration } = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

init({
  attachStacktrace: true,
  autoSessionTracking: true,
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  integrations: [nodeProfilingIntegration(), extraErrorDataIntegration({ depth: 10 }), sessionTimingIntegration()],
  normalizeDepth: 10,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  release: require("@exactly/common/generated/release"),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
});
