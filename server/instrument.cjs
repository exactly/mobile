const { extraErrorDataIntegration, init, sessionTimingIntegration } = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: "server",
  tracesSampleRate: 1,
  profilesSampleRate: 1,
  attachStacktrace: true,
  autoSessionTracking: true,
  integrations: [nodeProfilingIntegration(), extraErrorDataIntegration(), sessionTimingIntegration()],
});
