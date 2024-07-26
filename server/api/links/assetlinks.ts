import type { VercelRequest, VercelResponse } from "@vercel/node";

import fingerprint from "../../utils/android/fingerprint.js";

export default function assetlinks({ method }: VercelRequest, response: VercelResponse) {
  if (method !== "GET") return response.status(405).end("method not allowed");
  return response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: "app.exactly",
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]);
}
