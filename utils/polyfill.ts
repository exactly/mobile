import { atob, btoa } from "js-base64";
import { TextEncoder } from "text-encoding";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

global.atob ??= atob;
global.btoa ??= btoa;
global.TextEncoder ??= TextEncoder;

if (global.window) {
  // @ts-expect-error -- enough for mipd
  global.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
  global.window.addEventListener ??= () => {};
  global.window.dispatchEvent ??= () => false;
}

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
