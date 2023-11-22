import * as Sentry from "sentry-expo";

export default function handleError(error: unknown) {
  console.error(error); // eslint-disable-line no-console
  (Sentry.Native ?? Sentry.React).captureException(error); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}
