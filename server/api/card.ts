import { Address } from "@exactly/common/validation";
import { setUser } from "@sentry/node";
import { Mutex } from "async-mutex";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { parse } from "valibot";

import database, { cards, credentials } from "../database";
import auth from "../middleware/auth";
import { createCard, getPAN } from "../utils/cryptomate";
import { getInquiry } from "../utils/persona";

const mutexes = new Map<string, Mutex>();
function createMutex(credentialId: string) {
  const mutex = new Mutex();
  mutexes.set(credentialId, mutex);
  return mutex;
}

const app = new Hono();
app.use(auth);

export default app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const mutex = mutexes.get(credentialId) ?? createMutex(credentialId);
  return mutex
    .runExclusive(async () => {
      const credential = await database.query.credentials.findFirst({
        columns: { account: true, kycId: true },
        where: eq(credentials.id, credentialId),
        with: { cards: { columns: { id: true, lastFour: true }, where: eq(cards.status, "ACTIVE") } },
      });
      if (!credential) return c.json("credential not found", 401);
      const account = parse(Address, credential.account);
      setUser({ id: account });
      if (!credential.kycId) return c.json("kyc required", 403);
      if (credential.cards.length > 0) {
        return c.json({ lastFour: credential.cards[0]!.lastFour, url: await getPAN(credential.cards[0]!.id) }); // eslint-disable-line @typescript-eslint/no-non-null-assertion
      }
      const { data } = await getInquiry(credential.kycId);
      if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
      const phone = parsePhoneNumberWithError(
        data.attributes["phone-number"].startsWith("+")
          ? data.attributes["phone-number"]
          : `+${data.attributes["phone-number"]}`,
      );
      const card = await createCard({
        account,
        cardholder: [data.attributes["name-first"], data.attributes["name-middle"], data.attributes["name-last"]]
          .filter(Boolean)
          .join(" "),
        email: data.attributes["email-address"],
        limits: { daily: 1000, monthly: 5000, weekly: 3000 },
        phone: { countryCode: phone.countryCallingCode, number: phone.nationalNumber },
      });
      await database.insert(cards).values([{ credentialId, id: card.id, lastFour: card.last4 }]);
      return c.json({ lastFour: card.last4, url: await getPAN(card.id) });
    })
    .finally(() => {
      if (!mutex.isLocked()) mutexes.delete(credentialId);
    });
});
