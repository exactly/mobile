import type { AuthenticatorDevice, AuthenticatorTransportFuture } from "@simplewebauthn/typescript-types";
import { encode, decode } from "base64-arraybuffer";
import { eq } from "drizzle-orm";

import database from "../database/index.js";
import { credential as credentialSchema, challenge as challengeSchema } from "../database/schema.js";

export const origin = "http://localhost:8081"; // TODO: change this

// TODO: use function in /utils. for now it was not working
function base64URLEncode(buffer: ArrayBufferLike) {
  return encode(buffer).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64URLDecode(text: string) {
  const buffer = decode(text.replaceAll("-", "+").replaceAll("_", "/"));
  return new Uint8Array(buffer);
}

export async function saveChallenge({ userID, challenge }: { challenge: string; userID: string }) {
  await database.delete(challengeSchema).where(eq(challengeSchema.userID, userID));
  await database.insert(challengeSchema).values([{ userID, value: challenge }]);
}

export async function getChallenge(userID: string) {
  const [challenge] = await database.select().from(challengeSchema).where(eq(challengeSchema.userID, userID));
  await database.delete(challengeSchema).where(eq(challengeSchema.userID, userID));
  return challenge;
}

export async function saveCredentials(credential: AuthenticatorDevice & { userID: string }) {
  await database.insert(credentialSchema).values([
    {
      credentialID: base64URLEncode(credential.credentialID),
      transports: credential.transports,
      userID: credential.userID,
      credentialPublicKey: base64URLEncode(credential.credentialPublicKey).toString(),
      counter: credential.counter.toString(),
    },
  ]);
}

export async function getCredentials(userID: string) {
  const credentials = await database.select().from(credentialSchema).where(eq(credentialSchema.userID, userID));
  return credentials.map((cred) => ({
    ...cred,
    id: base64URLDecode(cred.credentialID),
    transports: cred.transports as AuthenticatorTransportFuture[],
    credentialPublicKey: base64URLDecode(cred.credentialPublicKey),
    credentialID: base64URLDecode(cred.credentialID),
    counter: Number(cred.counter),
  }));
}
