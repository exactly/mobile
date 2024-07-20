import type { ReadContractReturnType } from "viem";
import { create } from "zustand";

import type { previewerAbi } from "../generated/wagmi";

export type PreviewerData = ReadContractReturnType<typeof previewerAbi, "exactly", [`0x${string}`]>;

interface PreviewerState {
  data?: PreviewerData;
  setPreviewerData: (data: PreviewerData) => void;
}

export default create<PreviewerState>()((set) => ({
  data: undefined,
  setPreviewerData: (newData) => {
    set(() => ({ data: newData }));
  },
}));
