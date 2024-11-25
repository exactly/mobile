const { extraErrorDataIntegration, init } = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

init({
  release: require("@exactly/common/generated/release"),
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 1 : 0.01,
  attachStacktrace: true,
  autoSessionTracking: true,
  maxValueLength: 8192,
  normalizeDepth: 69,
  integrations: [nodeProfilingIntegration(), extraErrorDataIntegration({ depth: 69 })],
  spotlight: !process.env.APP_DOMAIN || process.env.APP_DOMAIN === "localhost",
  beforeSendTransaction: (transaction) => (transaction.extra?.["exa.ignore"] ? null : transaction),
});
