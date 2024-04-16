import * as Sentry from "@sentry/react-native";

export default function handleError(error: unknown) {
  console.error(error); // eslint-disable-line no-console
  Sentry.captureException(error);
}
