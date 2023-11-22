import { configureChains, createConfig, fetchBlockNumber } from "@wagmi/core";
import { goerli } from "@wagmi/core/chains";
import { alchemyProvider } from "@wagmi/core/providers/alchemy";
import { publicProvider } from "@wagmi/core/providers/public";
import { type ExpoRequest, ExpoResponse } from "expo-router/server";

const { publicClient, webSocketPublicClient } = configureChains(
  [goerli],
  [
    process.env.EXPO_PUBLIC_ALCHEMY_API_KEY
      ? alchemyProvider({ apiKey: process.env.EXPO_PUBLIC_ALCHEMY_API_KEY })
      : publicProvider(),
  ],
);
createConfig({ publicClient, webSocketPublicClient });

// eslint-disable-next-line import/prefer-default-export
export async function GET(_: ExpoRequest) {
  const blockNumber = await fetchBlockNumber();
  return ExpoResponse.json(Number(blockNumber));
}
