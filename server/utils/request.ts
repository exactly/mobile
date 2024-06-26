import type { z } from "zod";

import { type AccessTokenResponse, errorPayload } from "./types.js";

const { POMELO_CLIENT_ID, POMELO_CLIENT_SECRET, POMELO_AUDIENCE } = process.env;
if (!POMELO_CLIENT_ID || !POMELO_CLIENT_SECRET || !POMELO_AUDIENCE) throw new Error("missing pomelo vars");
if (!process.env.POMELO_BASE_URL) throw new Error("missing pomelo url");
const baseURL = process.env.POMELO_BASE_URL;

async function accessToken() {
  const response = await fetch(`${baseURL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      client_id: POMELO_CLIENT_ID,
      client_secret: POMELO_CLIENT_SECRET,
      audience: POMELO_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`error fetching access token: ${String(response.status)}`);
  const { access_token } = (await response.json()) as AccessTokenResponse;
  return access_token;
}

export default async function request<Response>(
  url: `/${string}`,
  init: Omit<RequestInit, "method" | "body"> & { method: "GET" | "POST" | "PATCH"; body?: object },
  validator: z.ZodType<Response>,
) {
  const _request = new Request(`${baseURL}${url}`, {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${await accessToken()}`,
    },
    body: JSON.stringify(init.body),
  });

  const response = await fetch(_request);
  const json: unknown = await response.json();

  if (!response.ok) {
    const {
      error: { details },
    } = errorPayload.parse(json);

    const detailsText = details.map(({ detail }) => detail).join(", ");
    switch (response.status) {
      case 400:
        throw new Error(`invalid request: ${detailsText}`);
      case 401:
        throw new Error("unauthorized");
      case 403:
        throw new Error("forbidden");
      case 404:
        throw new Error(`not found: ${detailsText}`);
      default:
        throw new Error(`unexpected error: ${String(response.status)}`); // TODO report to sentry
    }
  }

  try {
    return validator.parse(json);
  } catch {
    // TODO review with team
    // don't throw when validation fails?
    // maybe just report to sentry?
    return json as Response;
  }
}
