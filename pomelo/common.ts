import axios, { isAxiosError } from "axios";

import type { AccessTokenResponse, ErrorPayload } from "./types";
import { pomeloAudience, pomeloBaseUrl, pomeloClientId, pomeloClientSecret } from "../utils/constants";

const instance = axios.create({
  baseURL: pomeloBaseUrl,
  headers: {
    "Content-type": "application/json; charset=UTF-8",
  },
});

async function accessToken() {
  const {
    data: { access_token },
  } = await instance.post<AccessTokenResponse>("/oauth/token", {
    client_id: pomeloClientId,
    client_secret: pomeloClientSecret,
    audience: pomeloAudience,
    grant_type: "client_credentials",
  });
  return access_token;
}

export default async function request<Response>(
  method: "GET" | "POST" | "PATCH",
  url: `/${string}`,
  body?: object,
  headers?: Record<string, string>,
) {
  try {
    const { data } = await instance<Response>({
      method,
      url,
      data: body,
      headers: { ...headers, Authorization: `Bearer ${await accessToken()}` },
    });
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      switch (error.response?.status) {
        case 400: {
          const {
            error: { details },
          } = error.response.data as ErrorPayload;
          throw new Error(`Invalid Request: ${details.map(({ detail }) => detail).join(", ")}`);
        }
        case 401: {
          throw new Error("Unauthorized");
        }
        case 403: {
          throw new Error("Forbidden");
        }
        case 404: {
          const {
            error: { details },
          } = error.response.data as ErrorPayload;
          throw new Error(`Not Found: ${details.map(({ detail }) => detail).join(", ")}`);
        }
      }
    }
    throw new Error("Unexpected Error"); // TODO: report to Sentry
  }
}
