/* eslint-disable @typescript-eslint/no-unnecessary-condition */

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/prefer-module
global.crypto ??= new (require("@peculiar/webcrypto").Crypto)();

if (global.window) {
  // @ts-expect-error -- enough for mipd
  global.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
  global.window.addEventListener ??= () => {};
  global.window.removeEventListener ??= () => {};
  global.window.dispatchEvent ??= () => false;
}

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
