import AsyncStorage from "@react-native-async-storage/async-storage";
import { type create, get } from "react-native-passkeys";
import type { RegistrationResponseJSON } from "react-native-passkeys/build/ReactNativePasskeys.types";
import { type InferOutput, check, number, object, parse, pipe, regex, string } from "valibot";

import type { Base64URL, Passkey } from "@exactly/common/types";

import loadPasskey from "./loadPasskey";
import { apiURL } from "../constants";

export function registrationOptions() {
  return server<Parameters<typeof create>[0]>("/auth/registration");
}

export function verifyRegistration({
  userId,
  attestation,
}: {
  userId: Base64URL;
  attestation: RegistrationResponseJSON;
}) {
  return server<Passkey>(`/auth/registration?userId=${userId}`, { body: attestation });
}

export function getCards() {
  return auth("/card");
}

export function createCard(name: string) {
  return auth("/card", name);
}

async function accessToken() {
  try {
    return await loadAccessToken();
  } catch {
    return createAccessToken();
  }
}

async function createAccessToken() {
  const { credentialId } = await loadPasskey();
  const query = `?credentialId=${credentialId}`;
  const options = await server<Parameters<typeof get>[0]>(`/auth/authentication${query}`);
  const assertion = await get(options);
  if (!assertion) throw new Error("bad assertion");
  const jwt = await server<InferOutput<typeof JWT>>(`/auth/authentication${query}`, { body: assertion });
  await AsyncStorage.setItem("exactly.jwt", JSON.stringify(parse(JWT, jwt)));
  return jwt.token;
}

async function loadAccessToken() {
  const store = await AsyncStorage.getItem("exactly.jwt");
  if (!store) throw new Error("no token");
  return parse(JWT, JSON.parse(store)).token;
}

async function auth<T = unknown>(url: `/${string}`, body?: unknown, method?: "GET" | "POST") {
  return server<T>(url, { body, method, token: await accessToken() });
}

async function server<T = unknown>(
  url: `/${string}`,
  {
    body,
    token,
    method = body === undefined ? "GET" : "POST",
  }: { body?: unknown; token?: string; method?: "GET" | "POST" } = {},
) {
  const response = await fetch(`${apiURL}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${String(response.status)} ${await response.text()}`);
  return response.json() as Promise<T>;
}

const JWT = object({
  token: pipe(string(), regex(/^([\w=]+)\.([\w=]+)\.([\w+/=-]*)/)),
  expiresAt: pipe(
    number(),
    check((expiresAt) => expiresAt > Date.now() + 5 * 60_000),
  ),
});
