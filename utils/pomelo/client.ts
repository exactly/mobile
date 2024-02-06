import { startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/typescript-types";

import type { Card, CreateUserForm, User } from "../../pomelo/utils/types";
import base64URLEncode from "../base64URLEncode";
import { backendURL } from "../constants";
import generateRandomBuffer from "../generateRandomBuffer";

async function accessToken() {
  const challengeID = base64URLEncode(generateRandomBuffer());
  const optionsResponse = await fetch(`${backendURL}/auth/generate-authentication-options?challengeID=${challengeID}`);
  const options = (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON;
  const authenticationResponse = await startAuthentication(options);
  const verificationResp = await fetch(`${backendURL}/auth/verify-authentication?challengeID=${challengeID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(authenticationResponse),
  });
  const { verified, token } = (await verificationResp.json()) as { verified: boolean; token: string };

  if (!verified) {
    throw new Error("Authentication failed");
  }

  return token;
}

async function pomelo<Response>(
  url: `/${string}`,
  init: Omit<RequestInit, "method" | "body"> & { method: "GET" | "POST" | "PATCH"; body?: object },
  authenticated: boolean,
) {
  const _request = new Request(`${backendURL}${url}`, {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json; charset=UTF-8",
      ...(authenticated ? { Authorization: `Bearer ${await accessToken()}` } : {}),
    },
    body: JSON.stringify(init.body),
  });

  const response = await fetch(_request);
  const json: unknown = await response.json();

  if (!response.ok) {
    const {
      error: { details },
    } = json as { error: { details: { detail: string }[] } };

    const detailsText = details.map(({ detail }) => detail).join(", ");
    switch (response.status) {
      case 400: {
        throw new Error(`invalid request: ${detailsText}`);
      }
      case 401: {
        throw new Error("unauthorized");
      }
      case 403: {
        throw new Error("forbidden");
      }
      case 404: {
        throw new Error(`not found: ${detailsText}`);
      }
      default: {
        throw new Error(`unexpected error: ${response.status}`); // TODO report to sentry
      }
    }
  }

  return json as Response;
}

export async function getCards() {
  return pomelo<Card[]>("/card", { method: "GET" }, true);
}

export async function createCard() {
  return pomelo<Card>(
    "/card",
    {
      method: "POST",
    },
    true,
  );
}

export async function createUser(user: CreateUserForm) {
  return pomelo<User>("/user", { method: "POST", body: user }, true);
}

export async function getUser() {
  return pomelo<User>(
    "/user",
    {
      method: "GET",
    },
    true,
  );
}

export async function verifyRegistration({
  challengeID,
  attestation,
}: {
  challengeID: string;
  attestation: RegistrationResponseJSON;
}) {
  return pomelo<{ verified: boolean }>(
    `/auth/verify-registration?challengeID=${challengeID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: attestation,
    },
    false,
  );
}

export async function registrationOptions(challengeID: string) {
  return await pomelo<PublicKeyCredentialCreationOptionsJSON>(
    `/auth/generate-registration-options?challengeID=${challengeID}`,
    {
      method: "GET",
    },
    false,
  );
}
