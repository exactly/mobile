import { createConfig, getBlockNumber, http } from "@wagmi/core";
import { type ExpoRequest, ExpoResponse } from "expo-router/server";

import { alchemyAPIKey, chain } from "../utils/constants";

const httpConfig = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`) },
});

// eslint-disable-next-line import/prefer-default-export
export async function GET(_: ExpoRequest) {
  const blockNumber = await getBlockNumber(httpConfig);
  return ExpoResponse.json(Number(blockNumber));
}
