import { mainnet } from "@alchemy/aa-core";
import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import { createPublicClient, http } from "viem";

export default createPublicClient({
  chain: mainnet,
  transport: http(`${mainnet.rpcUrls.alchemy?.http[0]}/${alchemyAPIKey}`, { batch: true }),
});
