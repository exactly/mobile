import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import handleError from "../utils/handleError";

type TurnkeyState = {
  subOrganizationId?: string;
  signWith?: string;
};

const useTurnkeyStore = create<
  TurnkeyState & {
    connect: (subOrganizationId: string, signWith: string) => void;
    load: (subOrganizationId?: string, signWith?: string) => void;
  }
>()((set) => ({
  connect: (subOrganizationId, signWith) => {
    set({ subOrganizationId, signWith });
    AsyncStorage.setItem("turnkey.store", JSON.stringify({ subOrganizationId, signWith })).catch(handleError);
  },
  load: (subOrganizationId, signWith) => {
    set({ subOrganizationId, signWith });
  },
}));

AsyncStorage.getItem("turnkey.store")
  .then((store) => {
    if (!store) return;
    const { subOrganizationId, signWith } = JSON.parse(store) as TurnkeyState;
    useTurnkeyStore.getState().load(subOrganizationId, signWith);
  })
  .catch(handleError);

export default useTurnkeyStore;
