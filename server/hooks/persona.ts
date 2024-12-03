import { vValidator } from "@hono/valibot-validator";
import { captureException } from "@sentry/node";
import createDebug from "debug";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getName } from "i18n-iso-countries/index";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { array, length, literal, nullable, object, pipe, string, variant, type InferInput } from "valibot";

import database, { credentials } from "../database/index";
import { createUser } from "../utils/panda";
import { headerValidator } from "../utils/persona";

const debug = createDebug("exa:persona");
Object.assign(debug, { inspectOpts: { depth: undefined } });

const GovernmentID = object({
  type: literal("verification/government-id"),
  attributes: object({ status: literal("passed"), countryCode: pipe(string(), length(2)) }),
});
const IpAddress = object({
  type: literal("inquiry-session"),
  attributes: object({ status: literal("active"), ipAddress: string() }),
});

const Payload = object({
  data: object({
    attributes: object({
      payload: object({
        data: object({
          id: string(),
          attributes: object({
            status: literal("approved"),
            referenceId: string(),
            nameFirst: string(),
            nameLast: string(),
            birthdate: string(),
            emailAddress: string(),
            addressStreet1: string(),
            addressStreet2: nullable(string()),
            addressCity: string(),
            addressSubdivision: string(),
            addressPostalCode: string(),
            phoneNumber: string(),
            identificationNumber: string(),
            fields: object({
              selectedCountryCode: object({
                value: pipe(string(), length(2)),
              }),
              inputSelect: object({
                value: string(),
              }),
              anualSalary: object({
                value: string(),
              }),
              expectedMonthlyVolume: object({
                value: string(),
              }),
              accountPurpose: object({
                value: string(),
              }),
            }),
          }),
        }),
        included: array(
          variant("type", [
            GovernmentID,
            IpAddress,
            object({
              type: string(),
            }),
          ]),
        ),
      }),
    }),
  }),
});

export default new Hono().post(
  "/",
  headerValidator(),
  vValidator("json", Payload, (validation, c) => {
    if (debug.enabled) {
      c.req
        .text()
        .then(debug)
        .catch((error: unknown) => captureException(error));
    }
    if (!validation.success) {
      captureException(new Error("bad persona"), { contexts: { validation } });
      return c.json(
        validation.issues.map((issue) => `${issue.path?.map((p) => p.key).join("/")} ${issue.message}`),
        400,
      );
    }
  }),
  async (c) => {
    const payload = c.req.valid("json");
    const {
      data: {
        attributes: {
          nameFirst,
          nameLast,
          birthdate,
          emailAddress,
          addressStreet1,
          addressStreet2,
          addressCity,
          addressSubdivision,
          addressPostalCode,
          phoneNumber,
          identificationNumber,
          fields,
          referenceId,
        },
      },
      included,
    } = payload.data.attributes.payload;

    const phone = parsePhoneNumberWithError(phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`);
    const govermentId = included.find(
      (x): x is InferInput<typeof GovernmentID> => x.type === "verification/government-id",
    );
    if (!govermentId) return c.text("no government id", 400);

    const session = included.find((x): x is InferInput<typeof IpAddress> => x.type === "inquiry-session");
    if (!session) return c.text("no active inquiry session", 400);

    const { id } = await createUser({
      firstName: nameFirst,
      lastName: process.env.NODE_ENV === "production" ? nameLast : nameLast + "approved",
      birthDate: birthdate,
      nationalId: identificationNumber,
      countryOfIssue:
        process.env.NODE_ENV === "production" ? govermentId.attributes.countryCode : fields.selectedCountryCode.value,
      email: emailAddress,
      address: {
        line1: addressStreet1,
        line2: addressStreet2 ?? "",
        city: addressCity,
        region: addressSubdivision,
        postalCode: addressPostalCode,
        countryCode: fields.selectedCountryCode.value,
        country: getName(fields.selectedCountryCode.value, "en") ?? fields.selectedCountryCode.value,
      },
      phoneCountryCode: phone.countryCallingCode,
      phoneNumber: phone.nationalNumber,
      ipAddress: session.attributes.ipAddress,
      occupation: fields.inputSelect.value,
      annualSalary: fields.anualSalary.value,
      accountPurpose: fields.accountPurpose.value,
      expectedMonthlyVolume: fields.expectedMonthlyVolume.value,
      isTermsOfServiceAccepted: true,
    });

    await database.update(credentials).set({ pandaId: id }).where(eq(credentials.id, referenceId));

    return c.json({}, 200);
  },
);
