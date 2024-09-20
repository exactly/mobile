import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import {
  type Address,
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
  rpcSchema: rpcSchema<RpcSchema>(),
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
  getAssetTransfers: async (parameters: AssetTransfersParameters) =>
    client.request({ method: "alchemy_getAssetTransfers", params: [parameters] }),
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

export interface AssetTransfersParameters {
  fromBlock?: Hex | number | "latest" | "indexed";
  toBlock?: Hex | number | "latest" | "indexed";
  fromAddress?: Address;
  toAddress?: Address;
  contractAddresses?: readonly Address[];
  category: readonly ("external" | "internal" | "erc20" | "erc721" | "erc1155" | "specialnft")[];
  order?: "asc" | "desc";
  withMetadata: true;
  excludeZeroValue?: boolean;
  maxCount?: Hex;
  pageKey?: string;
}

export type AssetTransfer = {
  hash: Hash;
  blockNum: Hex;
  from: Address;
  to: Address;
  uniqueId: `${Hash}:${string}`;
  metadata: { blockTimestamp: string };
} & (
  | {
      category: "external" | "internal";
      asset: "ETH";
      value: number;
      tokenId: null;
      erc721TokenId: null;
      erc1155Metadata: null;
      rawContract: { address: null; value: Hex; decimal: "0x12" };
    }
  | {
      category: "erc20";
      asset: string | null;
      value: number | null;
      tokenId: null;
      erc721TokenId: null;
      erc1155Metadata: null;
      rawContract: { address: Address; value: Hex; decimal: Hex | null };
    }
  | {
      category: "erc721";
      asset: string | null;
      value: null;
      tokenId: Hex;
      erc721TokenId: Hex;
      erc1155Metadata: null;
      rawContract: { address: Address; value: null; decimal: "0x0" | null };
    }
  | {
      category: "erc1155";
      asset: string | null;
      value: null;
      tokenId: null;
      erc721TokenId: null;
      erc1155Metadata: { tokenId: Hex; value: Hex }[];
      rawContract: { address: Address; value: null; decimal: "0x0" | null };
    }
  | {
      category: "specialnft";
      asset: string | null;
      value: null;
      tokenId: Hex;
      erc721TokenId: null;
      erc1155Metadata: null;
      rawContract: { address: Address; value: null; decimal: "0x0" | null };
    }
);

export type RpcSchema = [
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
  {
    Method: "alchemy_getAssetTransfers";
    Parameters: [AssetTransfersParameters];
    ReturnType: { transfers: AssetTransfer[]; pageKey?: string };
  },
];
