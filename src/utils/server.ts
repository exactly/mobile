import domain from "@exactly/common/domain";
import type { Base64URL, Passkey } from "@exactly/common/types";
import { persistQueryClientSave } from "@tanstack/query-persist-client-core";
import { Platform } from "react-native";
import { type create, get } from "react-native-passkeys";
import type { RegistrationResponseJSON } from "react-native-passkeys/build/ReactNativePasskeys.types";
import { check, number, parse, pipe } from "valibot";

import loadPasskey from "./loadPasskey";
import queryClient, { persister } from "./queryClient";

export function registrationOptions() {
  return server<Parameters<typeof create>[0]>("/auth/registration");
}

export async function verifyRegistration({
  userId,
  attestation,
}: {
  userId: Base64URL;
  attestation: RegistrationResponseJSON;
}) {
  const { auth: expires, ...passkey } = await server<Passkey & { auth: number }>(
    `/auth/registration?userId=${userId}`,
    { body: attestation },
  );
  await queryClient.setQueryData(["auth"], parse(Auth, expires));
  await persistQueryClientSave({ queryClient, persister });
  return passkey;
}

export function getCard() {
  return auth<string>("/card");
}

export function kycOTL() {
  return auth<string>("/kyc", undefined, "POST");
}

export function kycStatus() {
  return auth<boolean>("/kyc");
}

async function auth<T = unknown>(url: `/${string}`, body?: unknown, method?: "GET" | "POST") {
  try {
    parse(Auth, queryClient.getQueryData(["auth"]));
  } catch {
    const { credentialId } = await loadPasskey();
    const query = `?credentialId=${credentialId}`;
    const options = await server<Parameters<typeof get>[0]>(`/auth/authentication${query}`);
    if (Platform.OS === "android") delete options.allowCredentials; // HACK fix android credential filtering
    const assertion = await get(options);
    if (!assertion) throw new Error("bad assertion");
    const { expires } = await server<{ expires: number }>(`/auth/authentication${query}`, { body: assertion });
    await queryClient.setQueryData(["auth"], parse(Auth, expires));
    await persistQueryClientSave({ queryClient, persister });
  }

  return server<T>(url, { method, body, credentials: "include" });
}

async function server<T = unknown>(url: `/${string}`, init?: Omit<RequestInit, "body"> & { body?: unknown }) {
  const response = await fetch(
    `${domain === "localhost" ? "http://localhost:3000/api" : `https://${domain}/api`}${url}`,
    {
      credentials: "include",
      ...init,
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    },
  );
  if (!response.ok) throw new Error(`${String(response.status)} ${await response.text()}`);
  return response.json() as Promise<T>;
}

const Auth = pipe(
  number(),
  check((expires) => Date.now() < expires),
);
