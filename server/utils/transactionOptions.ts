import chain from "@exactly/common/generated/chain";

export default {
  chainId: chain.id,
  type: "eip1559",
  maxFeePerGas: 1_000_000_000n,
  maxPriorityFeePerGas: 1_000_000n,
  gas: 2_000_000n,
} as const;
