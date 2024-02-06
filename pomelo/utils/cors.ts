import type { VercelApiHandler, VercelRequest, VercelResponse } from "@vercel/node";

import { ORIGIN } from "./auth";

const allowCors = (function_: VercelApiHandler) => async (request: VercelRequest, response: VercelResponse) => {
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Origin", ORIGIN);
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  response.setHeader("Access-Control-Allow-Headers", "*, Authorization");
  if (request.method === "OPTIONS") {
    response.status(200).end();
    return;
  }
  await function_(request, response);
};

export default allowCors;
