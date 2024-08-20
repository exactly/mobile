import { isoBase64URL } from "@simplewebauthn/server/helpers";

import fingerprint from "./fingerprint";

export default `android:apk-key-hash:${isoBase64URL.fromBuffer(Buffer.from(fingerprint.replaceAll(":", ""), "hex"))}`;
