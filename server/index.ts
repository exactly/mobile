import type { Base64URL } from "@exactly/common/types";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { sentry } from "@hono/sentry";
import { captureException, withScope } from "@sentry/node";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";

import authentication from "./api/auth/authentication";
import registration from "./api/auth/registration";
import card from "./api/card";
import kyc from "./api/kyc";
import passkey from "./api/passkey";
import activity from "./hooks/activity";
import block from "./hooks/block";
import cryptomate from "./hooks/cryptomate";
import androidFingerprint from "./utils/android/fingerprint";
import appOrigin from "./utils/appOrigin";

const app = new Hono();
app.use("*", sentry());
app.use(trimTrailingSlash());

app.use("/api/*", cors({ origin: appOrigin, credentials: true }));
app.route("/api/auth/authentication", authentication);
app.route("/api/auth/registration", registration);
app.route("/api/card", card);
app.route("/api/kyc", kyc);
app.route("/api/passkey", passkey);

app.route("/hooks/activity", activity);
app.route("/hooks/block", block);
app.route("/hooks/cryptomate", cryptomate);

app.use("/.well-known/*", serveStatic());
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
  withScope((scope) => {
    scope.setLevel("error");
    captureException(error);
  });
  return c.text(error instanceof Error ? error.message : String(error), 500);
});

serve(app);

declare module "hono" {
  interface ContextVariableMap {
    credentialId: Base64URL;
  }
}
