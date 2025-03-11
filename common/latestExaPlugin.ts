import { optimism } from "viem/chains";

import chain, { exaPluginAddress } from "./generated/chain";

export default {
  [optimism.id]: "0x2Bbaf52f13513CE325066D387c1dA1F260c26887",
}[chain.id] ?? exaPluginAddress;
