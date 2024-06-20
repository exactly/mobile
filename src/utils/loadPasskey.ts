import AsyncStorage from "@react-native-async-storage/async-storage";
import { parse } from "valibot";

import { Passkey } from "@exactly/common/types";

export default async function loadPasskey() {
  const store = await AsyncStorage.getItem("exactly.passkey");
  if (!store) throw new Error("no passkey");
  return parse(Passkey, JSON.parse(store));
}
