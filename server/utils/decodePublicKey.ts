import { cose, decodeCredentialPublicKey } from "@simplewebauthn/server/helpers";
import { bytesToHex } from "viem";

export default function decodePublicKey(bytes: Uint8Array) {
  const publicKey = decodeCredentialPublicKey(bytes);
  if (!cose.isCOSEPublicKeyEC2(publicKey)) throw new Error("bad public key");

  const x = publicKey.get(cose.COSEKEYS.x);
  const y = publicKey.get(cose.COSEKEYS.y);
  if (!x || !y) throw new Error("bad public key");

  return { x: bytesToHex(x), y: bytesToHex(y) };
}
