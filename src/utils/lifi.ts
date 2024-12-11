import chain, { mockSwapperAbi } from "@exactly/common/generated/chain";
import { Hex } from "@exactly/common/validation";
import { getContractCallsQuote } from "@lifi/sdk";
import { parse } from "valibot";
import { encodeFunctionData, maxUint256 } from "viem";
import { optimism } from "viem/chains";

export default async function getRoute(fromToken: Hex, toToken: Hex, toAmount: bigint, account: Hex) {
  if (chain.id === optimism.id) {
    const { estimate, transactionRequest } = await getContractCallsQuote({
      fee: 0.0025, // 0.25% fee
      slippage: 0.02, // 2% slippage // TODO review if necessary and the correct value
      integrator: "exa_app",
      fromChain: optimism.id,
      toChain: optimism.id,
      fromToken: fromToken.toString(), // TODO re-enable after testing
      toToken: toToken.toString(), // TODO re-enable after testing
      // fromToken: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", // WBTC on OP Mainnet
      // toToken: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on OP Mainnet
      toAmount: toAmount.toString(), // TODO review
      fromAddress: account,
      contractCalls: [],
    });
    return { fromAmount: BigInt(estimate.fromAmount), data: parse(Hex, transactionRequest?.data) };
  }
  const fromAmount = maxUint256; // TODO getAmountIn(address tokenIn, uint256 amountOut, address tokenOut) external view returns (uint256 amountIn);
  return {
    fromAmount,
    data: parse(
      Hex,
      encodeFunctionData<typeof mockSwapperAbi>({
        abi: mockSwapperAbi,
        functionName: "swapExactAmountOut",
        args: [fromToken, fromAmount, toToken, toAmount],
      }),
    ),
  };
}
