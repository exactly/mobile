import { Passkey } from "@exactly/common/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parse } from "valibot";

export default async function storePasskey(passkey: Passkey) {
  await AsyncStorage.setItem("exactly.passkey", JSON.stringify(parse(Passkey, passkey)));
  return passkey;
}
