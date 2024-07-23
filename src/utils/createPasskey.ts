import { Passkey } from "@exactly/common/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "react-native-passkeys";
import { parse } from "valibot";

import { registrationOptions, verifyRegistration } from "./server";

export default async function createPasskey() {
  const options = await registrationOptions();
  const attestation = await create(options);
  if (!attestation) throw new Error("bad attestation");
  const passkey = await verifyRegistration({ attestation, userId: options.user.id });
  await AsyncStorage.setItem("exactly.passkey", JSON.stringify(parse(Passkey, passkey)));
  return passkey;
}
