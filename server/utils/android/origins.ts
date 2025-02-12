import { isoBase64URL } from "@simplewebauthn/server/helpers";

import fingerprints from "./fingerprints";

export default fingerprints.map(
  (fingerprint) =>
    `android:apk-key-hash:${isoBase64URL.fromBuffer(Buffer.from(fingerprint.replaceAll(":", ""), "hex"))}`,
);
