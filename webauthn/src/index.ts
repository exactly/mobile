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

function stringify(object: unknown) {
  return JSON.stringify(object, (_, value) => {
    if (value instanceof ArrayBuffer) {
      return encode(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    }
    return value as unknown;
  });
}

function parse(text: string) {
  let clientExtensionResults: AuthenticationExtensionsClientOutputs = {};
  const credential = JSON.parse(text, (key, value) => {
    if (
      typeof value === "string" &&
      (key === "rawId" ||
        key === "publicKey" ||
        key === "signature" ||
        key === "userHandle" ||
        key === "clientDataJSON" ||
        key === "attestationObject" ||
        key === "authenticatorData")
    ) {
      return decode(value.replaceAll("-", "+").replaceAll("_", "/"));
    }
    if (key === "clientExtensionResults") {
      clientExtensionResults = value as AuthenticationExtensionsClientOutputs;
      return;
    }
    return value as unknown;
  }) as PublicKeyCredential;
  credential.getClientExtensionResults = () => clientExtensionResults;
  return credential;
}
