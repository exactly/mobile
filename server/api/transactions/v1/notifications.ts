import type { VercelRequest, VercelResponse } from "@vercel/node";

import buffer from "../../../utils/buffer.js";
import { sendPushNotification } from "../../../utils/notifications.js";
import { captureException } from "../../../utils/sentry.js";
import { notificationRequest } from "../../../utils/types.js";
import { signResponse, verifySignature } from "../../../utils/verify.js";

export const runtime = "nodejs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function notifications(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    return response.status(405).end("method not allowed");
  }

  const buf = await buffer(request);
  const raw = buf.toString("utf8");

  if (!verifySignature(request, raw)) {
    return response.status(403).end("forbidden");
  }

  const parsed = notificationRequest.safeParse(JSON.parse(raw));

  if (parsed.success) {
    const event = parsed.data.event_detail;
    try {
      await sendPushNotification({
        userId: event.user.id,
        headings: {
          en: event.status,
        },
        contents: {
          en: event.status_detail,
        },
      });
      return signResponse(request, response, JSON.stringify(true));
    } catch (error: unknown) {
      captureException(error, { request, message: "failed to send notification to user" });
      return response.status(500).end("internal server error");
    }
  } else {
    return response.status(400).end("bad request");
  }
}
