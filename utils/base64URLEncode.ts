import { encode } from "base64-arraybuffer";

export default function base64URLEncode(buffer: ArrayBufferLike) {
  return encode(buffer).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
