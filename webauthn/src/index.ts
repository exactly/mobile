import { base64URLStringToBuffer, bufferToBase64URLString } from "@simplewebauthn/browser";

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
  };
  // @ts-expect-error -- simplewebauthn's webauthn support detection
  global.window.PublicKeyCredential ??= () => {}; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}

function stringify(object: unknown) {
  return JSON.stringify(object, (_, value: unknown) => {
    if (value instanceof ArrayBuffer) return bufferToBase64URLString(value);
    return value;
  });
}

function parse(text: string) {
  let clientExtensionResults: AuthenticationExtensionsClientOutputs = {};
  const credential = JSON.parse(text, (key, value: unknown) => {
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
      return base64URLStringToBuffer(value);
    }
    if (key === "clientExtensionResults") {
      clientExtensionResults = value as AuthenticationExtensionsClientOutputs;
      return;
    }
    return value;
  }) as PublicKeyCredential;
  credential.getClientExtensionResults = () => clientExtensionResults;
  return credential;
}
