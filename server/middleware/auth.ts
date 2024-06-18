import type { Base64URL } from "@exactly/common/types.ts";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

import handleError from "../utils/handleError.ts";
import jwtSecret from "../utils/jwtSecret.ts";

export default function auth(
  handler: (
    request: VercelRequest,
    response: VercelResponse,
    credentialId: Base64URL,
  ) => VercelResponse | Promise<VercelResponse>,
) {
  return async function middleware(request: VercelRequest, response: VercelResponse) {
    const { authorization } = request.headers;
    if (!authorization) return response.status(401).end("no authorization");
    const match = authorization.match(/^bearer (?<token>\S+)\s*$/i);
    if (!match) return response.status(401).end("bad authorization");
    const token = match.groups?.token;
    if (!token) return response.status(401).end("no token");
    try {
      const { payload } = await jwtVerify<{ credentialId: Base64URL }>(token, jwtSecret);
      return handler(request, response, payload.credentialId);
    } catch (error) {
      handleError(error);
      return response.status(401).end(error instanceof Error ? error.message : error);
    }
  };
}
