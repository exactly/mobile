import { atob, btoa } from "react-native-quick-base64";
import { TextEncoder } from "text-encoding";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

global.atob ??= atob;
global.btoa ??= btoa;
global.TextEncoder ??= TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/prefer-module
global.crypto ??= new (require("@peculiar/webcrypto").Crypto)();

if (global.window) {
  // @ts-expect-error -- enough for mipd
  global.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
  global.window.addEventListener ??= () => {};
  global.window.dispatchEvent ??= () => false;
}

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
