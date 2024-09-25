import { type InferOutput, brand, check, custom, object, pipe, regex, string, transform } from "valibot";
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
  check((input) => isAddress(input, { strict: false }), "bad address"),
  transform((input) => checksumAddress(input as ViemAddress)),
  brand("Address"),
);

export const Base64URL = pipe(string(), regex(/^[\w-]+$/, "bad base64url"));

export const Hash = custom<ViemHash>(isHash as (hash: unknown) => hash is ViemHash, "bad hash");

export const Hex = custom<ViemHex>(isHex, "bad hex");

export const Passkey = object({ credentialId: Base64URL, factory: Address, x: Hash, y: Hash });

/* eslint-disable @typescript-eslint/no-redeclare */
export type Address = InferOutput<typeof Address>;
export type Base64URL = InferOutput<typeof Base64URL>;
export type Hash = InferOutput<typeof Hash>;
export type Hex = InferOutput<typeof Hex>;
export type Passkey = InferOutput<typeof Passkey>;
/* eslint-enable @typescript-eslint/no-redeclare */
