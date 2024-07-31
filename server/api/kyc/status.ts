import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import database, { credentials } from "../../database/index.js";
import auth from "../../middleware/auth.js";
import cors from "../../middleware/cors.js";

const apiKey = process.env.PERSONA_API_KEY as string;
const baseUrl = process.env.PERSONA_URL as string;

export default cors(
  auth(async function status({ method }: VercelRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "GET":
        try {
          const credential = await database.query.credentials.findFirst({
            columns: { id: true, kycId: true, kyc: true },
            where: eq(credentials.id, credentialId),
          });
          if (!credential) return response.status(404).end("credential not found");
          if (credential.kyc) return response.status(200).json(credential.kyc);
          if (!credential.kycId) return response.status(404).end("no kyc id");
          const getInquiry = await fetch(`${baseUrl}/inquiries/${credential.kycId}`, {
            method: "GET",
            headers: {
              accept: "application/json",
              "Persona-Version": "2023-01-05",
              "content-type": "application/json",
              authorization: `Bearer ${apiKey}`,
            },
          });
          if (!getInquiry.ok) throw new Error(`${String(getInquiry.status)} ${await getInquiry.text()}`);
          const result = v.parse(GetInquiryResponse, await getInquiry.json());
          const passed = result.data.attributes.status === "approved";
          await database.update(credentials).set({ kyc: passed }).where(eq(credentials.id, credentialId));
          return response.status(200).json(passed);
        } catch (error) {
          return response.status(500).end(error instanceof Error ? error.message : error);
        }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);

const GetInquiryResponse = v.object({
  data: v.object({
    type: v.literal("inquiry"),
    id: v.string(),
    attributes: v.object({
      status: v.nullish(v.string()),
    }),
  }),
});
