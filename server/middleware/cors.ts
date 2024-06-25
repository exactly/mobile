import { rpId } from "@exactly/common/constants.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const ORIGIN = rpId === "localhost" ? "http://localhost:8081" : `https://${rpId}`;

export default function cors(
  handler: (request: VercelRequest, response: VercelResponse) => VercelResponse | Promise<VercelResponse>,
) {
  return function middleware(request: VercelRequest, response: VercelResponse) {
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Origin", ORIGIN);
    response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    response.setHeader("Access-Control-Allow-Headers", "*, Authorization");
    if (request.method === "OPTIONS") return response.end();
    return handler(request, response);
  };
}
