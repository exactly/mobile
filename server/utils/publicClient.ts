import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { type CallParameters, createPublicClient, formatTransactionRequest, type Hash, type Hex, http } from "viem";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createPublicClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`),
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

export interface CallFrame {
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
}
