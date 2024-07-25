import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function assetlinks({ method }: VercelRequest, response: VercelResponse) {
  if (method !== "GET") return response.status(405).end("method not allowed");
  return response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
      target: {
        namespace: "android_app",
        package_name: "app.exactly",
        sha256_cert_fingerprints: [
          process.env.ANDROID_CERT_FINGERPRINT ||
            "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
        ],
      },
    },
  ]);
}
