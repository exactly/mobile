import type {
  AuthenticatorDevice,
  AuthenticatorTransportFuture,
  Base64URLString,
} from "@simplewebauthn/typescript-types";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { encode, decode } from "base64-arraybuffer";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import database from "../database/index.js";
import { credential as credentialSchema, challenge as challengeSchema } from "../database/schema.js";

type TokenPayload = {
  credentialID: string;
  iat: number;
  exp: number;
};

export const ORIGIN = "http://localhost:8081"; // TODO: this works for local development using web.  Check what would be the origin for mobile

// TODO: use function in /utils. for now it was not working
export function base64URLEncode(buffer: ArrayBufferLike) {
  return encode(buffer).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
// TODO: use function in /utils. for now it was not working
export function base64URLDecode(text: string) {
  const buffer = decode(text.replaceAll("-", "+").replaceAll("_", "/"));
  return new Uint8Array(buffer);
}

export async function saveChallenge({ challengeID, challenge }: { challenge: Base64URLString; challengeID: string }) {
  await database.delete(challengeSchema).where(eq(challengeSchema.id, challengeID));
  await database.insert(challengeSchema).values([{ id: challengeID, value: challenge }]);
}

export async function getChallenge(challengeID: string) {
  const [challenge] = await database.select().from(challengeSchema).where(eq(challengeSchema.id, challengeID));
  await database.delete(challengeSchema).where(eq(challengeSchema.id, challengeID));
  return challenge;
}

export async function saveCredentials(credential: AuthenticatorDevice) {
  await database.insert(credentialSchema).values([
    {
      credentialID: base64URLEncode(credential.credentialID),
      transports: credential.transports,
      credentialPublicKey: base64URLEncode(credential.credentialPublicKey).toString(),
      counter: credential.counter.toString(),
    },
  ]);
}

export async function getCredentialsByID(id: string) {
  const credentials = await database.select().from(credentialSchema).where(eq(credentialSchema.credentialID, id));
  return credentials.map((cred) => ({
    ...cred,
    id: base64URLDecode(cred.credentialID),
    transports: cred.transports as AuthenticatorTransportFuture[],
    credentialPublicKey: base64URLDecode(cred.credentialPublicKey),
    credentialID: base64URLDecode(cred.credentialID),
    counter: Number(cred.counter),
  }));
}

export const authenticated =
  (handler: (request: VercelRequest, response: VercelResponse, userID: string) => Promise<void>) =>
  async (request: VercelRequest, response: VercelResponse) => {
    const { authorization } = request.headers;
    if (!authorization) {
      response.status(400).end("No token provided");
      return;
    }
    const token = authorization.split("Bearer ")[1];
    if (!token) {
      response.status(400).end("No token provided");
      return;
    }
    const { credentialID } = jwt.decode(token) as TokenPayload;
    await handler(request, response, credentialID);
  };
