// import { captureException, init } from "@sentry/node";

// init({
//   dsn: process.env.SENTRY_DSN,
//   environment: process.env.ENV === "development" ? "development" : "production",
//   tracesSampleRate: 1,
//   attachStacktrace: true,
//   autoSessionTracking: true,
// });

export default function handleError(error: unknown) {
  console.error(error); // eslint-disable-line no-console
  // captureException(error); // TODO enable sentry
}
