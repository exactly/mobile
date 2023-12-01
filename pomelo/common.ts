import type { AccessTokenResponse, ErrorPayload } from "./types";
import { pomeloAudience, pomeloBaseUrl, pomeloClientId, pomeloClientSecret } from "../utils/constants";

async function accessToken() {
  const response = await fetch(`${pomeloBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      client_id: pomeloClientId,
      client_secret: pomeloClientSecret,
      audience: pomeloAudience,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`Error Fetching Access Token: ${response.status}`);
  const { access_token } = (await response.json()) as AccessTokenResponse;
  return access_token;
}

export default async function request<Response>(
  method: "GET" | "POST" | "PATCH",
  url: `/${string}`,
  body?: object,
  headers?: Record<string, string>,
) {
  const response = await fetch(pomeloBaseUrl + url, {
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
      throw new Error(`Invalid Request: ${detailsText}`);
    }
    case 401: {
      throw new Error("Unauthorized");
    }
    case 403: {
      throw new Error("Forbidden");
    }
    case 404: {
      throw new Error(`Not Found: ${detailsText}`);
    }
    default: {
      throw new Error(`Unexpected Error: ${response.status}`); // TODO: report to Sentry;
    }
  }
}
