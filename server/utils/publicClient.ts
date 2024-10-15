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
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`, { batch: true }),
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

const BaseTransfer = object({
  hash: Hash,
  blockNum: Hex,
  from: Hex,
  to: Hex,
  uniqueId: string(),
  metadata: object({ blockTimestamp: pipe(string(), isoTimestamp()) }),
});

export const ETHTransfer = object({
  ...BaseTransfer.entries,
  category: picklist(["external", "internal"]),
  asset: literal("ETH"),
  value: number(),
  tokenId: optional(null_()),
  erc721TokenId: optional(null_()),
  erc1155Metadata: optional(null_()),
  rawContract: object({ address: optional(null_()), value: Hex, decimal: literal("0x12") }),
});

export const ERC20Transfer = object({
  ...BaseTransfer.entries,
  category: literal("erc20"),
  asset: nullish(string()),
  value: nullish(number()),
  tokenId: optional(null_()),
  erc721TokenId: optional(null_()),
  erc1155Metadata: optional(null_()),
  rawContract: object({ address: Hex, value: Hex, decimal: nullish(Hex) }),
});

export const AssetTransfer = variant("category", [
  ETHTransfer,
  ERC20Transfer,
  object({
    ...BaseTransfer.entries,
    category: literal("erc721"),
    asset: nullish(string()),
    value: optional(null_()),
    tokenId: Hex,
    erc721TokenId: Hex,
    erc1155Metadata: optional(null_()),
    rawContract: object({ address: Hex, value: optional(null_()), decimal: nullish(literal("0x0")) }),
  }),
  object({
    ...BaseTransfer.entries,
    category: literal("erc1155"),
    asset: nullish(string()),
    value: optional(null_()),
    tokenId: optional(null_()),
    erc721TokenId: optional(null_()),
    erc1155Metadata: array(object({ tokenId: Hex, value: Hex })),
    rawContract: object({ address: Hex, value: optional(null_()), decimal: nullish(literal("0x0")) }),
  }),
  object({
    ...BaseTransfer.entries,
    category: literal("specialnft"),
    asset: nullish(string()),
    value: optional(null_()),
    tokenId: Hex,
    erc721TokenId: optional(null_()),
    erc1155Metadata: optional(null_()),
    rawContract: object({ address: Hex, value: optional(null_()), decimal: nullish(literal("0x0")) }),
  }),
]);

/* eslint-disable @typescript-eslint/no-redeclare */
export type ETHTransfer = InferOutput<typeof ETHTransfer>;
export type ERC20Transfer = InferOutput<typeof ERC20Transfer>;
export type AssetTransfer = InferOutput<typeof AssetTransfer>;
/* eslint-enable @typescript-eslint/no-redeclare */

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
