import { Address } from "@exactly/common/validation";
import { Analytics } from "@segment/analytics-node";
import { captureException, withScope } from "@sentry/node";
import { type InferOutput, object, parse, variant, literal, intersect, optional } from "valibot";

if (!process.env.SEGMENT_WRITE_KEY) throw new Error("missing segment write key");

const service = new Analytics({
  writeKey: process.env.SEGMENT_WRITE_KEY,
  maxRetries: 3,
  flushAt: 15,
  flushInterval: 10_000,
  httpRequestTimeout: 10_000,
});

const Event = intersect([
  object({
    userId: Address,
  }),
  variant("event", [
    object({
      event: literal("CardIssued"),
      properties: optional(object({})),
    }),
    object({
      event: literal("TransactionAuthorized"),
      properties: optional(object({})),
    }),
  ]),
]);

const Identity = object({
  userId: Address,
  traits: optional(object({})),
});

export const identify = (event: InferOutput<typeof Identity>) => {
  try {
    service.identify(parse(Identity, event));
  } catch (error: unknown) {
    withScope((scope) => {
      scope.setLevel("error");
      scope.setContext("event", event);
      captureException(error);
    });
  }
};

export const track = (event: InferOutput<typeof Event>) => {
  try {
    service.track(parse(Event, event));
  } catch (error: unknown) {
    withScope((scope) => {
      scope.setLevel("error");
      scope.setContext("event", event);
      captureException(error);
    });
  }
};

service.on("error", (error) => {
  withScope((scope) => {
    scope.setLevel("error");
    captureException(error);
  });
});

export const closeAnalytics = async () => {
  await service.closeAndFlush();
};
