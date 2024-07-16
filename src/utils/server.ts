import { type create, get } from "react-native-passkeys";
import type { RegistrationResponseJSON } from "react-native-passkeys/build/ReactNativePasskeys.types";

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
  const { credentialId } = await loadPasskey();
  const query = `?credentialId=${credentialId}`;
  const options = await server<Parameters<typeof get>[0]>(`/auth/authentication${query}`);
  const assertion = await get(options);
  if (!assertion) throw new Error("bad assertion");
  const { token } = await server<{ token: string }>(`/auth/authentication${query}`, { body: assertion });
  return token;
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
