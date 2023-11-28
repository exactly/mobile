import { TextEncoder } from "text-encoding";

/* eslint-disable @typescript-eslint/no-unnecessary-condition */

global.TextEncoder ??= TextEncoder;

// @ts-expect-error -- enough for mipd
global.CustomEvent ??= class {}; // eslint-disable-line @typescript-eslint/no-extraneous-class
global.window.addEventListener ??= () => {};
global.window.dispatchEvent ??= () => false;

/* eslint-enable @typescript-eslint/no-unnecessary-condition */
