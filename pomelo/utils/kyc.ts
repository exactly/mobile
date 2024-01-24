import { eq } from "drizzle-orm";

import database from "../database";
import { users } from "../database/schema";

const personaAPIKey = process.env.PERSONA_API_KEY;
const templateId = process.env.PERSONA_TEMPLATE_ID;

export type Workflow = "hosted" | "native";

type UserInquiryParameters = {
  user: string;
  workflow: Workflow;
};

export type UserInquiry = {
  id: string;
  url?: string;
};

export async function getUserInquiry(parameters: UserInquiryParameters): Promise<UserInquiry | undefined> {
  const [user] = await database
    .select({ inquiry_id: users.inquiry_id })
    .from(users)
    .where(eq(users.id, parameters.user));

  if (!user) {
    return undefined;
  }

  if (user.inquiry_id === null) {
    const inquiry = await newInquiry(parameters);
    await saveUserInquiry({ ...parameters, inquiry });
    const result: UserInquiry = { id: inquiry };
    if (parameters.workflow === "hosted") {
      result.url = await newOTLink(inquiry);
    }
    return result;
  }

  return { id: user.inquiry_id };
}

type UserInquiryUpdateParameters = {
  user: string;
  inquiry: string;
};

export async function saveUserInquiry(parameters: UserInquiryUpdateParameters) {
  await database.update(users).set({ inquiry_id: parameters.inquiry }).where(eq(users.id, parameters.user));
}

async function doRequest(url: string, init: RequestInit) {
  const request = new Request(url, {
    ...init,
    headers: {
      ...init.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${personaAPIKey}`,
    },
  });

  const response = await fetch(request);
  return response.json();
}

export async function newInquiry(parameters: UserInquiryParameters) {
  const response = (await doRequest("https://withpersona.com/api/v1/inquiries", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": templateId,
          "redirect-uri": parameters.workflow === "hosted" ? "http://localhost:8081" : undefined, // TODO
        },
      },
    }),
  })) as { data: { id: string } };

  return response.data.id;
}

export async function newOTLink(inquiry: string) {
  const response = (await doRequest(`https://withpersona.com/api/v1/inquiries/${inquiry}/generate-one-time-link`, {
    method: "POST",
  })) as { meta: { "one-time-link": string } };

  return response.meta["one-time-link"];
}
