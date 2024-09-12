const { extraErrorDataIntegration, init, sessionTimingIntegration } = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  attachStacktrace: true,
  autoSessionTracking: true,
  normalizeDepth: 10,
  integrations: [nodeProfilingIntegration(), extraErrorDataIntegration({ depth: 10 }), sessionTimingIntegration()],
});
