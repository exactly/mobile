import type { z } from "zod";

import { type AccessTokenResponse, errorPayload } from "./types";
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
  url: `/${string}`,
  init: Omit<RequestInit, "method" | "body"> & { method: "GET" | "POST" | "PATCH"; body?: object },
  validator: z.ZodType<Response>,
) {
  const _request = new Request(pomeloBaseUrl + url, {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${await accessToken()}`,
    },
    body: JSON.stringify(init.body),
  });

  const response = await fetch(_request);
  const json = response.json();

  if (!response.ok) {
    const {
      error: { details },
    } = errorPayload.parse(json);

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

  return validator.parse(json);
}
