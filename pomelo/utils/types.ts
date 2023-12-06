import { z } from "zod";

const country = z.enum(["ARG", "BRA", "MEX", "COL", "PER", "CHL"]);

const date = z.string().datetime();

const address = z.object({
  street_name: z.string(),
  street_number: z.number(),
  floor: z.string(),
  apartment: z.string(),
  zip_code: z.number(),
  neighborhood: z.string(),
  city: z.string(),
  region: z.string(),
  additional_info: z.string(),
  country,
});

const currencyAmount = z.object({
  total: z.number(),
  currency: z.string(),
});

const accessTokenResponse = z.object({
  access_token: z.string(),
  scope: z.string(),
  expires_in: z.number(),
  token_type: z.literal("Bearer"),
});

export type AccessTokenResponse = z.infer<typeof accessTokenResponse>;

export const errorPayload = z.object({
  error: z.object({
    error_code: z.string(),
    details: z
      .object({
        code: z.string(),
        detail: z.string(),
      })
      .array(),
  }),
});

export type ErrorPayload = z.infer<typeof errorPayload>;

export const user = z.object({
  id: z.string().regex(/^usr-.*/),
  client_id: z.string().regex(/^cli-.*/),
  email: z.string().email(),
  status: z.enum(["ACTIVE", "BLOCKED"]),
  operation_country: country,
  name: z.string().optional(),
  surname: z.string().optional(),
  identification_type: z.enum(["DNI", "LE", "LC", "CI", "PASSPORT", "RG", "CNH", "INE", "CC", "CE", "PPT"]).optional(),
  identification_value: z.string().optional(),
  birthdate: date.optional(),
  gender: z.string().optional(),
  phone: z.number(),
  tax_identification_type: z.enum(["CUIL", "CUIT", "CDI", "CPF", "RUT", "RUC", "RFC", "NIT"]).optional(),
  tax_identification_value: z.string().optional(),
  nationality: country,
  legal_address: address.optional(),
});

export type User = z.infer<typeof user>;

const createUserRequest = user.omit({
  id: true,
  client_id: true,
  status: true,
});

export type CreateUserRequest = z.infer<typeof createUserRequest>;

export const card = z.object({
  id: z.string().regex(/^crd-.*/),
  user_id: user.shape.id,
  affinity_group_id: z.string().regex(/^afg-.*/),
  card_type: z.enum(["VIRTUAL", "PHYSICAL"]),
  product_type: z.enum(["PREPAID", "DEBIT", "CREDIT"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DISABLED"]).optional(),
  shipment_id: z
    .string()
    .regex(/^shi-.*/)
    .optional(),
  start_date: date.optional(),
  last_four: z.string().optional(),
  provider: z.enum(["MASTERCARD", "VISA"]).optional(),
  affinity_group_name: z.string().optional(),
});

export type Card = z.infer<typeof card>;

const createCardRequest = z.intersection(
  card.pick({
    user_id: true,
    affinity_group_id: true,
    card_type: true,
  }),
  z.object({
    address: address.optional(),
    previous_card_id: card.shape.id.optional(),
  }),
);

export type CreateCardRequest = z.infer<typeof createCardRequest>;

export const authorizationRequest = z.object({
  transaction: z.object({
    id: z.string().regex(/^ctx-.*/),
    type: z.string(),
    point_type: z.string(),
    entry_mode: z.string(),
    country_code: z.string(),
    origin: z.string(),
    source: z.string(),
    original_transaction_id: z.string().regex(/^ctx-.*/),
    local_date_time: date,
  }),
  merchant: z.object({
    id: z.string(),
    mcc: z.string(),
    address: z.string(),
    name: z.string(),
  }),
  card: card.pick({
    id: true,
    product_type: true,
    provider: true,
    last_four: true,
  }),
  user: user.pick({ id: true }),
  amount: z.object({
    local: currencyAmount,
    settlement: currencyAmount,
    transaction: currencyAmount,
    details: z
      .object({
        type: z.string(),
        currency: z.string(),
        amount: z.string(),
        name: z.string(),
      })
      .array(),
  }),
});

export type AuthorizationRequest = z.infer<typeof authorizationRequest>;

const authorizationResponse = z.intersection(
  z.object({
    message: z.string(),
  }),
  z.discriminatedUnion("status", [
    z.object({
      status: z.literal("APPROVED"),
      status_detail: z.enum(["APPROVED"]),
    }),
    z.object({
      status: z.literal("REJECTED"),
      status_detail: z.enum(["INSUFFICIENT_FUNDS", "INVALID_MERCHANT", "INVALID_AMOUNT", "SYSTEM_ERROR", "OTHER"]),
    }),
  ]),
);

export type AuthorizationResponse = z.infer<typeof authorizationResponse>;

export const paginated = <T extends z.ZodType<object>>(data: T) =>
  z.object({
    data: data.array(),
    meta: z.object({
      pagination: z.object({
        total_pages: z.number(),
        current: z.number(),
      }),
    }),
  });

export type Paginated<T extends z.ZodType<object>> = z.infer<ReturnType<typeof paginated<T>>>;
