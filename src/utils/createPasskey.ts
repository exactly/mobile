import AsyncStorage from "@react-native-async-storage/async-storage";
import { startRegistration } from "@simplewebauthn/browser";
import { parse } from "valibot";

import { Passkey } from "@exactly/common/types";

import { registrationOptions, verifyRegistration } from "./server";

export default async function createPasskey() {
  const options = await registrationOptions();
  const attestation = await startRegistration(options);
  const passkey = await verifyRegistration({ attestation, userId: options.user.id });
  await AsyncStorage.setItem("exactly.passkey", JSON.stringify(parse(Passkey, passkey)));
  return passkey;
}
