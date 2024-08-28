import { vValidator } from "@hono/valibot-validator";
import { captureException, setContext } from "@sentry/node";
import type { Debugger } from "debug";
import { validator } from "hono/validator";
import { createHmac } from "node:crypto";
import type { BaseIssue, BaseSchema } from "valibot";

export function headerValidator(signingKey: string) {
  return validator("header", async ({ "x-alchemy-signature": signature }, c) => {
    if (
      signature !==
      createHmac("sha256", signingKey)
        .update(Buffer.from(await c.req.arrayBuffer()))
        .digest("hex")
    ) {
      return c.text("unauthorized", 401);
    }
  });
}

export function jsonValidator<TInput, TOutput, TIssue extends BaseIssue<unknown>>(
  schema: BaseSchema<TInput, TOutput, TIssue>,
  debug: Debugger,
  filter?: (result: TOutput) => boolean,
) {
  return vValidator("json", schema, (result, c) => {
    if (!result.success) {
      setContext("validation", result);
      captureException(new Error("bad alchemy"));
      return c.text("bad request", 400);
    }
    if (debug.enabled && (!filter || filter(result.output))) {
      c.req
        .text()
        .then(debug)
        .catch((error: unknown) => {
          captureException(error);
        });
    }
  });
}