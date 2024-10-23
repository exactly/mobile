import type { Base64URL } from "@exactly/common/validation";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { sentry } from "@hono/sentry";
import { captureException } from "@sentry/node";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";

import activity from "./api/activity";
import authentication from "./api/auth/authentication";
import registration from "./api/auth/registration";
import card from "./api/card";
import kyc from "./api/kyc";
import passkey from "./api/passkey";
import activityHook from "./hooks/activity";
import block from "./hooks/block";
import cryptomate from "./hooks/cryptomate";
import androidFingerprint from "./utils/android/fingerprint";
import appOrigin from "./utils/appOrigin";
import { closeAndFlush } from "./utils/segment";

const app = new Hono();
app.use(sentry());
app.use(trimTrailingSlash());
app.use("/api/*", cors({ origin: appOrigin, credentials: true }));
app.use("/.well-known/*", serveStatic());

const api = app
  .route("/api/auth/authentication", authentication)
  .route("/api/auth/registration", registration)
  .route("/api/activity", activity)
  .route("/api/card", card)
  .route("/api/kyc", kyc)
  .route("/api/passkey", passkey);
export default api;
export type ExaServer = typeof api;

app.route("/hooks/activity", activityHook);
app.route("/hooks/block", block);
app.route("/hooks/cryptomate", cryptomate);
app.get("/.well-known/assetlinks.json", (c) =>
  c.json([
    {
      relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: "app.exactly",
        sha256_cert_fingerprints: [androidFingerprint],
      },
    },
  ]),
);

app.onError((error, c) => {
  captureException(error, { level: "error" });
  return c.text(error instanceof Error ? error.message : String(error), 500);
});

serve(app);

["SIGINT", "SIGTERM"].map((code) =>
  process.on(code, () => {
    closeAndFlush().catch(() => undefined);
  }),
);

declare module "hono" {
  interface ContextVariableMap {
    credentialId: Base64URL;
  }
}
