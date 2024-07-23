import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAccount, readContract } from "@wagmi/core";
import { zeroAddress, type ReadContractReturnType } from "viem";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { previewerAddress, previewerAbi } from "../generated/contracts";
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
          const previewerData = await readContract(wagmiConfig, {
            address: previewerAddress,
            abi: previewerAbi,
            functionName: "exactly",
            args: [getAccount(wagmiConfig).address || zeroAddress],
          });
          set({ data: previewerData });
        } catch (error) {
          handleError(error);
        }
      },
    }),
    {
      name: "previewer",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
