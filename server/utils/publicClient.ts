import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import {
  type BlockNumber,
  type BlockTag,
  type CallParameters,
  createPublicClient,
  formatTransactionRequest,
  type Hash,
  type Hex,
  http,
  rpcSchema,
  type RpcTransactionRequest,
} from "viem";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createPublicClient({
  chain,
  rpcSchema: rpcSchema<
    [
      {
        Method: "debug_traceCall";
        Parameters:
          | [transaction: RpcTransactionRequest]
          | [transaction: RpcTransactionRequest, block: BlockNumber | BlockTag]
          | [
              transaction: RpcTransactionRequest,
              block: BlockNumber | BlockTag,
              (
                | { tracer: "callTracer"; tracerConfig: { onlyTopCall?: boolean; withLog?: boolean } }
                | { tracer: "prestateTracer"; tracerConfig: { diffMode?: boolean } }
              ),
            ];
        ReturnType: CallFrame;
      },
    ]
  >(),
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`),
}).extend((client) => ({
  traceCall: async ({ blockNumber, blockTag = "latest", ...call }: CallParameters) =>
    client.request({
      method: "debug_traceCall",
      params: [
        formatTransactionRequest(call),
        blockNumber ?? blockTag,
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
