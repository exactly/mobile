import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccount } from "@wagmi/core";
import { zeroAddress, type ReadContractReturnType } from "viem";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { previewerAbi } from "../generated/contracts";
import { previewerAddress, readPreviewerExactly } from "../generated/contracts";
import handleError from "../utils/handleError";
import wagmiConfig from "../utils/wagmi";

export type PreviewerExactlyData = ReadContractReturnType<typeof previewerAbi, "exactly", [`0x${string}`]>;

interface PreviewerState {
  data?: PreviewerExactlyData;
  fetch: () => Promise<void>;
}

export default create(
  persist<PreviewerState>(
    (set) => ({
      data: undefined,
      fetch: async () => {
        try {
          set({
            data: await readPreviewerExactly(wagmiConfig, {
              address: previewerAddress,
              args: [getAccount(wagmiConfig).address || zeroAddress],
            }),
          });
        } catch (error) {
          handleError(error);
        }
      },
    }),
    {
      name: "previewer",
      storage: createJSONStorage(() => AsyncStorage, {
        replacer: (_, value) => (typeof value === "bigint" ? `${value.toString()}n` : value),
        reviver: (_, value) => (typeof value === "string" && /^\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value),
      }),
    },
  ),
);
