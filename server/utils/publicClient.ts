import { alchemyAPIKey, chain } from "@exactly/common/constants.js";
import { createPublicClient, http } from "viem";

import debugTransportConfig from "./debug/transportConfig.js";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

const transportConfig = process.env.DEBUG ? debugTransportConfig : undefined;

export default createPublicClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`, transportConfig),
});
