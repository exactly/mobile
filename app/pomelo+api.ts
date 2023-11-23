import { configureChains, createConfig, fetchBlockNumber } from "@wagmi/core";
import { alchemyProvider } from "@wagmi/core/providers/alchemy";
import { publicProvider } from "@wagmi/core/providers/public";
import { type ExpoRequest, ExpoResponse } from "expo-router/server";

import { alchemyAPIKey, chain } from "../utils/constants";

const { publicClient, webSocketPublicClient } = configureChains(
  [chain],
  [alchemyAPIKey ? alchemyProvider({ apiKey: alchemyAPIKey }) : publicProvider()],
);
createConfig({ publicClient, webSocketPublicClient });

// eslint-disable-next-line import/prefer-default-export
export async function GET(_: ExpoRequest) {
  const blockNumber = await fetchBlockNumber();
  return ExpoResponse.json(Number(blockNumber));
}
