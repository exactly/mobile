import type { VercelApiHandler, VercelRequest, VercelResponse } from "@vercel/node";

const allowCors = (function_: VercelApiHandler) => async (request: VercelRequest, response: VercelResponse) => {
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:8081");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type",
  );
  if (request.method === "OPTIONS") {
    response.status(200).end();
    return;
  }
  await function_(request, response);
};

export default allowCors;
