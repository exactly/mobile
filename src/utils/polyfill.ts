/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import "fast-text-encoding";

global.crypto ??= new (require("@peculiar/webcrypto").Crypto)(); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, unicorn/prefer-module

if (global.window) {
  // @ts-expect-error -- enough for mipd
  global.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
  global.window.addEventListener ??= () => undefined;
  global.window.removeEventListener ??= () => undefined;
  global.window.dispatchEvent ??= () => false;
}

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
