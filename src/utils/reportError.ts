import { captureException } from "@sentry/react-native";

export default function reportError(error: unknown) {
  console.error(error); // eslint-disable-line no-console
  return captureException(error);
}
