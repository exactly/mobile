import { encode, decode } from "base64-arraybuffer";

import ExpoWebauthn from "./ExpoWebauthn";

// @ts-expect-error -- polyfill
global.navigator.credentials ??= {
  async get(options) {
    if (!options?.publicKey) throw new Error("publicKey required");
    return parse(await ExpoWebauthn.get(stringify(options.publicKey)));
  },
  async create(options) {
    if (!options?.publicKey) throw new Error("publicKey required");
    return parse(await ExpoWebauthn.create(stringify(options.publicKey)));
  },
} as CredentialsContainer;

function stringify(value: unknown) {
  return JSON.stringify(value, (_, v) => {
    if (v instanceof ArrayBuffer) {
      return encode(v).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    }
    return v as unknown;
  });
}

function parse(text: string) {
  return JSON.parse(text, (key, v) => {
    if (
      typeof v === "string" &&
      (key === "rawId" ||
        key === "publicKey" ||
        key === "signature" ||
        key === "userHandle" ||
        key === "clientDataJSON" ||
        key === "authenticatorData" ||
        key === "clientExtensionResults")
    ) {
      return decode(v.replace(/-/g, "+").replace(/_/g, "/"));
    }
    return v as unknown;
  }) as PublicKeyCredential;
}
