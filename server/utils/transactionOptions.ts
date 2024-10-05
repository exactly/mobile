import chain from "@exactly/common/generated/chain";

export default {
  chainId: chain.id,
  gas: 2_000_000n,
  maxFeePerGas: 1_000_000_000n,
  maxPriorityFeePerGas: 1_000_000n,
  type: "eip1559",
} as const;
