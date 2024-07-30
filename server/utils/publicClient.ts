import alchemyAPIKey from "@exactly/common/alchemyAPIKey.js";
import chain from "@exactly/common/chain.js";
import { type CallParameters, createPublicClient, formatTransactionRequest, type Hash, type Hex, http } from "viem";

import debugTransportConfig from "./debug/transportConfig.js";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

const transportConfig = process.env.DEBUG ? debugTransportConfig : undefined;

export default createPublicClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`, transportConfig),
}).extend((client) => ({
  traceCall: async ({ blockNumber, blockTag = "latest", ...call }: CallParameters): Promise<CallFrame> =>
    client.request({
      // @ts-expect-error -- extending
      method: "debug_traceCall",
      params: [
        formatTransactionRequest(call),
        // @ts-expect-error -- extending
        blockNumber ?? blockTag,
        // @ts-expect-error -- extending
        { tracer: "callTracer", tracerConfig: { withLog: true } },
      ],
    }),
}));

export type CallFrame = {
  type: "CALL" | "CREATE" | "STATICCALL" | "DELEGATECALL";
  from: string;
  to: string;
  value?: Hex;
  gas: Hex;
  gasUsed: Hex;
  input: Hex;
  output?: Hex;
  error?: string;
  revertReason?: string;
  calls?: CallFrame[];
  logs?: {
    address: Hex;
    topics?: [] | [signature: Hash, ...args: Hash[]];
    data?: Hex;
    position: Hex;
  }[];
};
