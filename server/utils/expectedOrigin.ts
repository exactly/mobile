import { isoBase64URL } from "@simplewebauthn/server/helpers";

import androidFingerprint from "./android/fingerprint.js";
import appOrigin from "./appOrigin";

const androidOrigin = `android:apk-key-hash:${isoBase64URL.fromBuffer(Buffer.from(androidFingerprint.replaceAll(":", ""), "hex"))}`;

export default function expectedOrigin(userAgent?: string) {
  if (userAgent?.match(/okhttp\/\d+\.\d+\.\d+/)) return androidOrigin;
  return appOrigin;
}
