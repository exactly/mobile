import { type InferOutput, custom, object, pipe, regex, string } from "valibot";
import { type Hash as ViemHash, isHash } from "viem";

export const Base64URL = pipe(string(), regex(/^[\w-]+$/));

export const Hash = custom<ViemHash>(isHash as (hash: unknown) => hash is ViemHash);

export const Passkey = object({ credentialId: Base64URL, x: Hash, y: Hash });

/* eslint-disable @typescript-eslint/no-redeclare */
export type Base64URL = InferOutput<typeof Base64URL>;
export type Hash = InferOutput<typeof Hash>;
export type Passkey = InferOutput<typeof Passkey>;
/* eslint-enable @typescript-eslint/no-redeclare */
