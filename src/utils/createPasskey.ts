import { create } from "react-native-passkeys";

import { registrationOptions, verifyRegistration } from "./server";

export default async function createPasskey() {
  const options = await registrationOptions();
  const attestation = await create(options);
  if (!attestation) throw new Error("bad attestation");
  return verifyRegistration({ attestation, userId: options.user.id });
}
