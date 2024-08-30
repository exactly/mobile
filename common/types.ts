import { type InferOutput, check, custom, email, number, object, pipe, regex, string, transform } from "valibot";
import {
  type Address as ViemAddress,
  checksumAddress,
  type Hash as ViemHash,
  type Hex as ViemHex,
  isAddress,
  isHash,
  isHex,
} from "viem";

export const Address = pipe(
  string(),
  check((input) => isAddress(input, { strict: false })),
  transform((input) => checksumAddress(input as ViemAddress)),
);

export const Base64URL = pipe(string(), regex(/^[\w-]+$/));

export const Hash = custom<ViemHash>(isHash as (hash: unknown) => hash is ViemHash);

export const Hex = custom<ViemHex>(isHex);

export const Passkey = object({ credentialId: Base64URL, factory: Address, x: Hash, y: Hash });

export const CreateCardParameters = object({
  account: Address,
  cardholder: string(),
  email: pipe(string(), email()),
  phone: object({ countryCode: pipe(string(), regex(/^\d{2}$/)), number: pipe(string(), regex(/^\d+$/)) }),
  limits: object({ daily: number(), weekly: number(), monthly: number() }),
});

/* eslint-disable @typescript-eslint/no-redeclare */
export type Address = InferOutput<typeof Address>;
export type Base64URL = InferOutput<typeof Base64URL>;
export type Hash = InferOutput<typeof Hash>;
export type Hex = InferOutput<typeof Hex>;
export type Passkey = InferOutput<typeof Passkey>;
export type CreateCardParameters = InferOutput<typeof CreateCardParameters>;
/* eslint-enable @typescript-eslint/no-redeclare */
