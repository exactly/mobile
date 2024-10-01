import { Address } from "@exactly/common/validation";
import { vValidator } from "@hono/valibot-validator";
import { setUser } from "@sentry/node";
import { Mutex } from "async-mutex";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { literal, object, parse, union } from "valibot";

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

export default app
  .get("/", async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      where: eq(credentials.id, credentialId),
      columns: { account: true, kycId: true },
      with: {
        cards: {
          columns: { id: true, lastFour: true, status: true },
          where: inArray(cards.status, ["ACTIVE", "FROZEN"]),
        },
      },
    });
    if (!credential) return c.json({ error: "credential not found" }, 401);
    const account = parse(Address, credential.account);
    setUser({ id: account });
    if (!credential.kycId) return c.json({ error: "kyc required" }, 403);
    if (credential.cards.length > 0 && credential.cards[0]) {
      const { id, lastFour, status } = credential.cards[0];
      return c.json({ url: await getPAN(id), lastFour, status });
    } else {
      return c.json({ error: "card not found" }, 404);
    }
  })
  .post("/", async (c) => {
    const credentialId = c.get("credentialId");
    const mutex = mutexes.get(credentialId) ?? createMutex(credentialId);
    return mutex
      .runExclusive(async () => {
        const credential = await database.query.credentials.findFirst({
          where: eq(credentials.id, credentialId),
          columns: { account: true, kycId: true },
          with: {
            cards: { columns: { status: true }, where: inArray(cards.status, ["ACTIVE", "FROZEN"]) },
          },
        });
        if (!credential) return c.json({ error: "credential not found" }, 401);
        const account = parse(Address, credential.account);
        setUser({ id: account });
        if (!credential.kycId) return c.json({ error: "kyc required" }, 403);
        const { data } = await getInquiry(credential.kycId);
        if (data.attributes.status !== "approved") return c.json({ error: "kyc not approved" }, 403);
        if (credential.cards.length > 0) {
          return c.json({ error: "card already exists" }, 400);
        }
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
          phone: { countryCode: phone.countryCallingCode, number: phone.nationalNumber },
          limits: { daily: 1000, weekly: 3000, monthly: 5000 },
        });
        await database.insert(cards).values([{ id: card.id, credentialId, lastFour: card.last4 }]);
        return c.json({ url: await getPAN(card.id), lastFour: card.last4, status: card.status }); // TODO review if necessary
      })
      .finally(() => {
        if (!mutex.isLocked()) mutexes.delete(credentialId);
      });
  })
  .patch(
    "/",
    vValidator(
      "json",
      object({
        status: union([literal("ACTIVE"), literal("FROZEN")]),
      }),
    ),
    async (c) => {
      const { status } = c.req.valid("json");
      const credentialId = c.get("credentialId");
      const mutex = mutexes.get(credentialId) ?? createMutex(credentialId);
      return mutex
        .runExclusive(async () => {
          const credential = await database.query.credentials.findFirst({
            where: eq(credentials.id, credentialId),
            with: {
              cards: { columns: { id: true, status: true }, where: inArray(cards.status, ["ACTIVE", "FROZEN"]) },
            },
          });
          if (!credential) return c.json({ error: "credential not found" }, 401);
          if (credential.cards.length === 0 || !credential.cards[0]) return c.json({ error: "no card found" }, 404);
          const card = credential.cards[0];
          if (card.status === status) return c.json({ error: `card is already ${status.toLowerCase()}` }, 400);
          await database.update(cards).set({ status }).where(eq(cards.id, card.id));
          return c.json({ status });
        })
        .finally(() => {
          if (!mutex.isLocked()) mutexes.delete(credentialId);
        });
    },
  );
