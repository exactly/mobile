import type { Base64URL } from "@exactly/common/validation";
import { serve } from "@hono/node-server";
import { sentry } from "@hono/sentry";
import { captureException, close } from "@sentry/node";
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
import panda from "./hooks/panda";
import persona from "./hooks/persona";
import androidFingerprints from "./utils/android/fingerprints";
import appOrigin from "./utils/appOrigin";
import { closeAndFlush } from "./utils/segment";

const app = new Hono();
app.use(sentry());
app.use(trimTrailingSlash());
app.use("/api/*", cors({ origin: appOrigin, credentials: true }));

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
app.route("/hooks/panda", panda);
app.route("/hooks/persona", persona);

app.get("/.well-known/apple-app-site-association", (c) =>
  c.json({ webcredentials: { apps: ["665NDX7LBZ.app.exactly"] } }),
);
app.get("/.well-known/assetlinks.json", (c) =>
  c.json([
    {
      relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: "app.exactly",
        sha256_cert_fingerprints: androidFingerprints,
      },
    },
  ]),
);

app.onError((error, c) => {
  captureException(error, { level: "error" });
  return c.json(error instanceof Error ? error.message : String(error), 500);
});

const server = serve(app);

["SIGINT", "SIGTERM"].map((code) =>
  process.on(code, () =>
    server.close((error) => {
      Promise.allSettled([close(), closeAndFlush()])
        .then((results) => {
          process.exit(error || results.some((result) => result.status === "rejected") ? 1 : 0); // eslint-disable-line n/no-process-exit
        })
        .catch(() => undefined);
    }),
  ),
);

declare module "hono" {
  interface ContextVariableMap {
    credentialId: Base64URL;
  }
}
