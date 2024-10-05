import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { Hash, Hex } from "@exactly/common/validation";
import {
  array,
  type InferOutput,
  isoTimestamp,
  literal,
  null_,
  nullish,
  number,
  object,
  optional,
  picklist,
  pipe,
  string,
  variant,
} from "valibot";
import {
  type Address,
  type BlockNumber,
  type BlockTag,
  type CallParameters,
  createPublicClient,
  formatTransactionRequest,
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
  getAssetTransfers: async (parameters: AssetTransfersParameters) =>
    client.request({ method: "alchemy_getAssetTransfers", params: [parameters] }),
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

const BaseTransfer = object({
  blockNum: Hex,
  from: Hex,
  hash: Hash,
  metadata: object({ blockTimestamp: pipe(string(), isoTimestamp()) }),
  to: Hex,
  uniqueId: string(),
});

export const ETHTransfer = object({
  ...BaseTransfer.entries,
  asset: literal("ETH"),
  category: picklist(["external", "internal"]),
  erc721TokenId: optional(null_()),
  erc1155Metadata: optional(null_()),
  rawContract: object({ address: optional(null_()), decimal: literal("0x12"), value: Hex }),
  tokenId: optional(null_()),
  value: number(),
});

export const ERC20Transfer = object({
  ...BaseTransfer.entries,
  asset: nullish(string()),
  category: literal("erc20"),
  erc721TokenId: optional(null_()),
  erc1155Metadata: optional(null_()),
  rawContract: object({ address: Hex, decimal: nullish(Hex), value: Hex }),
  tokenId: optional(null_()),
  value: nullish(number()),
});

export const AssetTransfer = variant("category", [
  ETHTransfer,
  ERC20Transfer,
  object({
    ...BaseTransfer.entries,
    asset: nullish(string()),
    category: literal("erc721"),
    erc721TokenId: Hex,
    erc1155Metadata: optional(null_()),
    rawContract: object({ address: Hex, decimal: nullish(literal("0x0")), value: optional(null_()) }),
    tokenId: Hex,
    value: optional(null_()),
  }),
  object({
    ...BaseTransfer.entries,
    asset: nullish(string()),
    category: literal("erc1155"),
    erc721TokenId: optional(null_()),
    erc1155Metadata: array(object({ tokenId: Hex, value: Hex })),
    rawContract: object({ address: Hex, decimal: nullish(literal("0x0")), value: optional(null_()) }),
    tokenId: optional(null_()),
    value: optional(null_()),
  }),
  object({
    ...BaseTransfer.entries,
    asset: nullish(string()),
    category: literal("specialnft"),
    erc721TokenId: optional(null_()),
    erc1155Metadata: optional(null_()),
    rawContract: object({ address: Hex, decimal: nullish(literal("0x0")), value: optional(null_()) }),
    tokenId: Hex,
    value: optional(null_()),
  }),
]);

/* eslint-disable @typescript-eslint/no-redeclare */
export type ETHTransfer = InferOutput<typeof ETHTransfer>;
export type ERC20Transfer = InferOutput<typeof ERC20Transfer>;
export type AssetTransfer = InferOutput<typeof AssetTransfer>;
/* eslint-enable @typescript-eslint/no-redeclare */

export interface CallFrame {
  calls?: CallFrame[];
  error?: string;
  from: string;
  gas: Hex;
  gasUsed: Hex;
  input: Hex;
  logs?: {
    address: Hex;
    data?: Hex;
    position: Hex;
    topics?: [] | [signature: Hash, ...args: Hash[]];
  }[];
  output?: Hex;
  revertReason?: string;
  to: string;
  type: "CALL" | "CREATE" | "DELEGATECALL" | "STATICCALL";
  value?: Hex;
}

export interface AssetTransfersParameters {
  category: readonly ("erc20" | "erc721" | "erc1155" | "external" | "internal" | "specialnft")[];
  contractAddresses?: readonly Address[];
  excludeZeroValue?: boolean;
  fromAddress?: Address;
  fromBlock?: "indexed" | "latest" | Hex | number;
  maxCount?: Hex;
  order?: "asc" | "desc";
  pageKey?: string;
  toAddress?: Address;
  toBlock?: "indexed" | "latest" | Hex | number;
  withMetadata: true;
}

export type RpcSchema = [
  {
    Method: "debug_traceCall";
    Parameters:
      | [
          transaction: RpcTransactionRequest,
          block: BlockNumber | BlockTag,
          (
            | { tracer: "callTracer"; tracerConfig: { onlyTopCall?: boolean; withLog?: boolean } }
            | { tracer: "prestateTracer"; tracerConfig: { diffMode?: boolean } }
          ),
        ]
      | [transaction: RpcTransactionRequest, block: BlockNumber | BlockTag]
      | [transaction: RpcTransactionRequest];
    ReturnType: CallFrame;
  },
  {
    Method: "alchemy_getAssetTransfers";
    Parameters: [AssetTransfersParameters];
    ReturnType: { pageKey?: string; transfers: AssetTransfer[] };
  },
];
