import domain from "@exactly/common/domain";
import { Passkey } from "@exactly/common/validation";
import type { ExaServer } from "@exactly/server";
import { hc } from "hono/client";
import { Platform } from "react-native";
import { get as assert } from "react-native-passkeys";
import type { RegistrationResponseJSON } from "react-native-passkeys/build/ReactNativePasskeys.types";
import { check, number, parse, pipe, safeParse } from "valibot";

import queryClient from "./queryClient";

queryClient.setQueryDefaults<number>(["auth"], {
  staleTime: Infinity,
  initialData: 0,
  retry: false,
  queryFn: async () => {
    try {
      const credentialId = queryClient.getQueryData<Passkey>(["passkey"])?.credentialId;
      const get = await client.api.auth.authentication.$get({ query: { credentialId } });
      const options = await get.json();
      if (Platform.OS === "android") delete options.allowCredentials; // HACK fix android credential filtering
      const assertion = await assert(options);
      if (!assertion) throw new Error("bad assertion");
      const post = await client.api.auth.authentication.$post({
        query: { credentialId: assertion.id },
        json: assertion,
      });
      if (!post.ok) throw new APIError(post.status, await post.json());
      const { expires } = await post.json();
      return parse(Auth, expires);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message ===
          "The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)" ||
          error.message === "The operation couldn’t be completed. Device must be unlocked to perform request." ||
          error.message === "UserCancelled")
      ) {
        return 0;
      }
      return 0;
    }
  },
});

const client = hc<ExaServer>(domain === "localhost" ? "http://localhost:3000/" : `https://${domain}/`, {
  init: { credentials: "include" },
});

export async function registrationOptions() {
  const response = await client.api.auth.registration.$get();
  return response.json();
}

export async function verifyRegistration(attestation: RegistrationResponseJSON) {
  const response = await client.api.auth.registration.$post({ json: attestation });
  if (!response.ok) {
    const raw = response.clone();
    throw new APIError(response.status, await response.json().catch(() => raw.text()));
  }
  const { auth: expires, ...passkey } = await response.json();
  await queryClient.setQueryData(["auth"], parse(Auth, expires));
  return parse(Passkey, passkey);
}

export async function getCard() {
  await auth();
  const response = await client.api.card.$get();
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function createCard() {
  await auth();
  const response = await client.api.card.$post();
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function setCardStatus(status: "ACTIVE" | "FROZEN") {
  await auth();
  const response = await client.api.card.$patch({ json: { status } });
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function setCardMode(mode: number) {
  await auth();
  const response = await client.api.card.$patch({ json: { mode } });
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function getKYCLink() {
  await auth();
  const response = await client.api.kyc.$post();
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function getKYCStatus() {
  await auth();
  const response = await client.api.kyc.$get();
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function getPasskey() {
  await auth();
  const response = await client.api.passkey.$get();
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function getActivity(parameters?: NonNullable<Parameters<typeof client.api.activity.$get>[0]>["query"]) {
  await auth();
  const response = await client.api.activity.$get(
    parameters?.include === undefined ? undefined : { query: { include: parameters.include } },
  );
  const text = await response.text();
  if (!response.ok) throw new APIError(response.status, text);
  return JSON.parse(text) as Awaited<ReturnType<typeof response.json>>;
}

export async function auth() {
  if (queryClient.isFetching({ queryKey: ["auth"] })) return;
  const { success } = safeParse(Auth, queryClient.getQueryData<number | undefined>(["auth"]));
  if (!success) await queryClient.fetchQuery({ queryKey: ["auth"] });
}

const Auth = pipe(
  number(),
  check((expires) => Date.now() < expires),
);

export class APIError extends Error {
  code: number;
  text: string;

  constructor(code: number, text: string) {
    super(`${code} ${text}`);
    this.code = code;
    this.text = text;
    this.name = "APIError";
  }
}
