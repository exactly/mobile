import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { getAddress } from "viem";

import database, { cards, credentials } from "../database";
import auth from "../middleware/auth";
import { createCard, getPAN } from "../utils/cryptomate";
import { getInquiry } from "../utils/persona";

const app = new Hono();

app.use("*", auth);

app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
    columns: { account: true, kycId: true },
    with: { cards: { columns: { id: true } } },
  });
  if (!credential) return c.text("credential not found", 401);
  if (!credential.kycId) return c.text("kyc required", 403);
  if (credential.cards.length > 0) return c.json(await getPAN(credential.cards[0]!.id)); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const { data } = await getInquiry(credential.kycId);
  if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
  const phone = parsePhoneNumberWithError(
    data.attributes["phone-number"].startsWith("+")
      ? data.attributes["phone-number"]
      : `+${data.attributes["phone-number"]}`,
  );
  const card = await createCard({
    account: getAddress(credential.account),
    cardholder: [data.attributes["name-first"], data.attributes["name-middle"], data.attributes["name-last"]]
      .filter(Boolean)
      .join(" "),
    email: data.attributes["email-address"],
    phone: { countryCode: phone.countryCallingCode, number: phone.nationalNumber },
    limits: { daily: 1000, weekly: 3000, monthly: 5000 },
  });
  await database.insert(cards).values([{ id: card.id, credentialId, lastFour: card.last4 }]);
  return c.json(await getPAN(card.id));
});

export default app;
