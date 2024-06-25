import { startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

import type { Base64URL, Passkey } from "@exactly/common/types";

import loadPasskey from "./loadPasskey";
import { apiURL } from "../constants";

export function registrationOptions() {
  return server<PublicKeyCredentialCreationOptionsJSON>("/auth/registration");
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
  const options = await server<PublicKeyCredentialRequestOptionsJSON>(`/auth/authentication${query}`);
  const body = await startAuthentication(options);
  const { token } = await server<{ token: string }>(`/auth/authentication${query}`, { body });
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
