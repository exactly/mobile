import { decode } from "base64-arraybuffer";

export default function base64URLDecode(value: string) {
  return decode(value.replaceAll("-", "+").replaceAll("_", "/"));
}
