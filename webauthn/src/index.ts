import { encode, decode } from "base64-arraybuffer";

import ExpoWebauthn from "./ExpoWebauthn";

if (ExpoWebauthn) {
  const webauthn = ExpoWebauthn;
  // @ts-expect-error -- polyfill
  global.navigator.credentials ??= {
    async get(options) {
      if (!options?.publicKey) throw new Error("publicKey required");
      return parse(await webauthn.get(stringify(options.publicKey)));
    },
    async create(options) {
      if (!options?.publicKey) throw new Error("publicKey required");
      return parse(await webauthn.create(stringify(options.publicKey)));
    },
  } as CredentialsContainer;
  // @ts-expect-error -- turnkey's webauthn support detection
  global.window.PublicKeyCredential = {} as PublicKeyCredential;
}

function stringify(value: unknown) {
  return JSON.stringify(value, (_, v) => {
    if (v instanceof ArrayBuffer) {
      return encode(v).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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
      return decode(v.replaceAll("-", "+").replaceAll("_", "/"));
    }
    return v as unknown;
  }) as PublicKeyCredential;
}
