import { optimism } from "viem/chains";

import chain, { exaPluginAddress } from "./generated/chain";

export default {
  [optimism.id]: "0x87aF7e4892e47a7De34dF689bA5f3bCccED3e5DE",
}[chain.id] ?? exaPluginAddress;
