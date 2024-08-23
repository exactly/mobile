import { cose, decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";
import { bytesToHex, type Hex } from "viem";

export default function decodePublicKey(bytes: Uint8Array): { x: Hex; y: Hex };
export default function decodePublicKey<T>(bytes: Uint8Array, decoder: (input: Uint8Array) => T): { x: T; y: T };
export default function decodePublicKey<T>(bytes: Uint8Array, decoder: (input: Uint8Array) => T | Hex = bytesToHex) {
  const publicKey = decodeCredentialPublicKey(bytes);
  if (!cose.isCOSEPublicKeyEC2(publicKey)) throw new Error("bad public key");

  const x = publicKey.get(cose.COSEKEYS.x);
  const y = publicKey.get(cose.COSEKEYS.y);
  if (!x || !y) throw new Error("bad public key");

  return { x: decoder(x), y: decoder(y) };
}
