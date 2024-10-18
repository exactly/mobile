import MAX_INSTALLMENTS from "@exactly/common/MAX_INSTALLMENTS";
import { Address } from "@exactly/common/validation";
import { vValidator } from "@hono/valibot-validator";
import { setUser } from "@sentry/node";
import { Mutex } from "async-mutex";
import { eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { integer, maxValue, minValue, number, parse, picklist, pipe, strictObject, transform, union } from "valibot";

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
          columns: { id: true, lastFour: true, status: true, mode: true },
          where: inArray(cards.status, ["ACTIVE", "FROZEN"]),
        },
      },
    });
    if (!credential) return c.json("credential not found", 401);
    const account = parse(Address, credential.account);
    setUser({ id: account });
    if (!credential.kycId) return c.json("kyc required", 403);
    if (credential.cards.length > 0 && credential.cards[0]) {
      const { id, lastFour, status, mode } = credential.cards[0];
      return c.json({ url: await getPAN(id), lastFour, status, mode }, 200);
    } else {
      return c.json("card not found", 404);
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
        if (!credential) return c.json("credential not found", 401);
        const account = parse(Address, credential.account);
        setUser({ id: account });
        if (!credential.kycId) return c.json("kyc required", 403);
        const { data } = await getInquiry(credential.kycId);
        if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
        if (credential.cards.length > 0) return c.json("card already exists", 400);
        const phone = parsePhoneNumberWithError(
          data.attributes["phone-number"].startsWith("+")
            ? data.attributes["phone-number"]
            : `+${data.attributes["phone-number"]}`,
        );
        const card = await createCard({
          account,
          email: data.attributes["email-address"],
          name: {
            first: data.attributes["name-first"],
            middle: data.attributes["name-middle"],
            last: data.attributes["name-last"],
          },
          phone: { countryCode: phone.countryCallingCode, number: phone.nationalNumber },
          limits: { daily: 1000, weekly: 3000, monthly: 5000 },
        });
        await database.insert(cards).values([{ id: card.id, credentialId, lastFour: card.last4 }]);
        return c.json({ url: await getPAN(card.id), lastFour: card.last4, status: card.status }, 200); // TODO review if necessary
      })
      .finally(() => {
        if (!mutex.isLocked()) mutexes.delete(credentialId);
      });
  })
  .patch(
    "/",
    vValidator(
      "json",
      union([
        pipe(
          strictObject({ mode: pipe(number(), integer(), minValue(0), maxValue(MAX_INSTALLMENTS)) }),
          transform((patch) => ({ ...patch, type: "mode" as const })),
        ),
        pipe(
          strictObject({ status: picklist(["ACTIVE", "FROZEN"]) }),
          transform((patch) => ({ ...patch, type: "status" as const })),
        ),
      ]),
    ),
    async (c) => {
      const patch = c.req.valid("json");
      const credentialId = c.get("credentialId");
      const mutex = mutexes.get(credentialId) ?? createMutex(credentialId);
      return mutex
        .runExclusive(async () => {
          const credential = await database.query.credentials.findFirst({
            columns: { account: true },
            where: eq(credentials.id, credentialId),
            with: {
              cards: { columns: { id: true, mode: true, status: true }, where: ne(cards.status, "DELETED") },
            },
          });
          if (!credential) return c.json("credential not found", 401);
          setUser({ id: parse(Address, credential.account) });
          if (credential.cards.length === 0 || !credential.cards[0]) return c.json("no card found", 404);
          const card = credential.cards[0];
          switch (patch.type) {
            case "mode": {
              const { mode } = patch;
              if (card.mode === mode) return c.json(`card mode is already ${mode}`, 400);
              await database.update(cards).set({ mode }).where(eq(cards.id, card.id));
              return c.json({ mode }, 200);
            }
            case "status": {
              const { status } = patch;
              if (card.status === status) return c.json(`card is already ${status.toLowerCase()}`, 400);
              await database.update(cards).set({ status }).where(eq(cards.id, card.id));
              return c.json({ status }, 200);
            }
          }
        })
        .finally(() => {
          if (!mutex.isLocked()) mutexes.delete(credentialId);
        });
    },
  );
