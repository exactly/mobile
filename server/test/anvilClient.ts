import { createTestClient, http, publicActions, walletActions } from "viem";
import { foundry } from "viem/chains";

export default createTestClient({ chain: foundry, mode: "anvil", transport: http(undefined, { batch: true }) })
  .extend(publicActions)
  .extend(walletActions);
