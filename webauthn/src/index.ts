import { encode } from "base64-arraybuffer";

import ExpoWebauthn from "./ExpoWebauthn";

// @ts-expect-error -- polyfill
global.navigator.credentials ??= {
  get(options) {
    if (!options?.publicKey) throw new Error("publicKey required");
    return ExpoWebauthn.get(stringify(options.publicKey));
  },
  async create(options) {
    if (!options?.publicKey) throw new Error("publicKey required");
    return ExpoWebauthn.create(stringify(options.publicKey));
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
