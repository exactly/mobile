import type { AccessTokenResponse, ErrorPayload } from "./types.js";

const { POMELO_BASE_URL, POMELO_CLIENT_ID, POMELO_CLIENT_SECRET, POMELO_AUDIENCE } = process.env;
if (!POMELO_BASE_URL || !POMELO_CLIENT_ID || !POMELO_CLIENT_SECRET || !POMELO_AUDIENCE) {
  throw new Error("missing pomelo vars");
}

async function accessToken() {
  const response = await fetch(`${POMELO_BASE_URL}/oauth/token`, {
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
  if (!response.ok) throw new Error(`error fetching access token: ${response.status}`);
  const { access_token } = (await response.json()) as AccessTokenResponse;
  return access_token;
}

export default async function request<Response>(
  method: "GET" | "POST" | "PATCH",
  url: `/${string}`,
  body?: object,
  headers?: Record<string, string>,
) {
  const response = await fetch(`${POMELO_BASE_URL}${url}`, {
    method,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${await accessToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (response.ok) return response.json() as Response;

  const {
    error: { details },
  } = (await response.json()) as ErrorPayload;

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
