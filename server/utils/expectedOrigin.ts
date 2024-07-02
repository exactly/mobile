import { ORIGIN } from "../middleware/cors.js";

export default function expectedOrigin(userAgent?: string) {
  if (userAgent?.match(/okhttp\/\d+\.\d+\.\d+/)) {
    return "android:apk-key-hash:-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w";
  }
  return ORIGIN;
}
