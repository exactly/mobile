import { type ExpoRequest, ExpoResponse } from "expo-router/server";

export async function GET(_: ExpoRequest) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return ExpoResponse.json({ message: "hello, world!" });
}
