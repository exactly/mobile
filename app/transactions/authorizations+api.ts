import { createConfig, getBlockNumber, http } from "@wagmi/core";
import { type ExpoRequest, ExpoResponse } from "expo-router/server";

import { verifySignature, signResponse } from "../../pomelo/verify";
import { alchemyAPIKey, chain } from "../../utils/constants";

const httpConfig = createConfig({
  chains: [chain],
  transports: { [chain.id]: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`) },
});

export const runtime = "nodejs";

export async function POST(request: ExpoRequest) {
  if (!(await verifySignature(request))) {
    return ExpoResponse.json("", { status: 403 });
  }

  const blockNumber = await getBlockNumber(httpConfig);
  return signResponse(request, ExpoResponse.json(Number(blockNumber)));
}
