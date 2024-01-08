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
  global.window.PublicKeyCredential ??= {} as PublicKeyCredential; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
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
  let clientExtensionResults: AuthenticationExtensionsClientOutputs = {};
  const credential = JSON.parse(text, (key, v) => {
    if (
      typeof v === "string" &&
      (key === "rawId" ||
        key === "publicKey" ||
        key === "signature" ||
        key === "userHandle" ||
        key === "clientDataJSON" ||
        key === "authenticatorData")
    ) {
      return decode(v.replaceAll("-", "+").replaceAll("_", "/"));
    }
    if (key === "clientExtensionResults") {
      clientExtensionResults = v as AuthenticationExtensionsClientOutputs;
      return;
    }
    return v as unknown;
  }) as PublicKeyCredential;
  credential.getClientExtensionResults = () => clientExtensionResults;
  return credential;
}
