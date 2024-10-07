/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import "fast-text-encoding";

globalThis.crypto ??= new (require("@peculiar/webcrypto").Crypto)(); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, unicorn/prefer-module

if (globalThis.window) {
  // @ts-expect-error -- enough for mipd
  globalThis.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
  globalThis.window.addEventListener ??= () => undefined;
  globalThis.window.removeEventListener ??= () => undefined;
  globalThis.window.dispatchEvent ??= () => false;
}

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
