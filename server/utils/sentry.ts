import * as Sentry from "@sentry/node";
import type { VercelRequest } from "@vercel/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENV === "development" ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  autoSessionTracking: true,
});

type ExceptionProperties = {
  request: VercelRequest;
  message: string;
};

export function captureException(error: unknown, { request: { url }, message }: ExceptionProperties) {
  try {
    Sentry.captureException(error, { tags: { url, message } });
  } catch {
    // ignore
  }
}

export default Sentry;
