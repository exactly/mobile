import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import * as v from "valibot";

import database, { credentials } from "../../database/index.js";
import auth from "../../middleware/auth.js";
import cors, { origin } from "../../middleware/cors.js";

const apiKey = process.env.PERSONA_API_KEY as string;
const baseUrl = process.env.PERSONA_URL as string;
const templateId = process.env.PERSONA_TEMPLATE_ID as string;

interface OTLRequest extends VercelRequest {
  body: {
    nameFirst: string;
    nameMiddle: string;
    nameLast: string;
    emailAddress: string;
  };
}

export default cors(
  auth(async function oneTimeLink({ method }: OTLRequest, response: VercelResponse, credentialId: string) {
    switch (method) {
      case "GET":
        try {
          const credential = await database.query.credentials.findFirst({
            columns: { id: true, kycId: true },
            where: eq(credentials.id, credentialId),
          });
          if (!credential) return response.status(404).end("credential not found");
          let inquiryId = credential.kycId;
          const headers = {
            accept: "application/json",
            "Persona-Version": "2023-01-05",
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          };
          if (!credential.kycId) {
            const createInquiry = await fetch(`${baseUrl}/inquiries`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                data: {
                  attributes: {
                    "inquiry-template-id": templateId,
                    "redirect-uri": origin,
                    // TODO replace fields with actual data
                    fields: {
                      "name-first": "Jane",
                      "name-middle": "Marie",
                      "name-last": "Doe",
                      "email-address": "jane@doe.com",
                    },
                  },
                },
              }),
            });
            if (!createInquiry.ok) throw new Error(`${String(createInquiry.status)} ${await createInquiry.text()}`);
            const result = v.parse(CreateInquiryResponse, await createInquiry.json());
            inquiryId = result.data.id;
          }
          if (!inquiryId) throw new Error("no kyc id");
          const generateOTL = await fetch(`${baseUrl}/inquiries/${inquiryId}/generate-one-time-link`, {
            method: "POST",
            headers,
          });
          if (!generateOTL.ok) throw new Error(`${String(generateOTL.status)} ${await generateOTL.text()}`);
          const result = v.parse(GenerateOTLResponse, await generateOTL.json());
          await database.update(credentials).set({ kycId: inquiryId }).where(eq(credentials.id, credentialId));
          return response.status(200).json(result.meta["one-time-link"]);
        } catch (error) {
          return response.status(500).end(error instanceof Error ? error.message : error);
        }
      default:
        return response.status(405).end("method not allowed");
    }
  }),
);

const Attributes = v.object({
  "name-first": v.nullish(v.string()),
  "name-middle": v.nullish(v.string()),
  "name-last": v.nullish(v.string()),
  "email-address": v.nullish(v.string()),
});

const InquiryData = v.object({
  type: v.literal("inquiry"),
  id: v.string(),
  attributes: Attributes,
});

const CreateInquiryResponse = v.object({
  data: InquiryData,
});

const GenerateOTLResponse = v.object({
  data: InquiryData,
  meta: v.object({
    "one-time-link": v.string(),
    "one-time-link-short": v.string(),
  }),
});
