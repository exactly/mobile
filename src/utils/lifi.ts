import chain, { mockSwapperAbi, mockSwapperAddress } from "@exactly/common/generated/chain";
import { Hex } from "@exactly/common/validation";
import { config, getContractCallsQuote } from "@lifi/sdk";
import { parse } from "valibot";
import { encodeFunctionData } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

import publicClient from "./publicClient";

async function getRoute(fromToken: Hex, toToken: Hex, toAmount: bigint, account: Hex) {
  if (chain.id === optimismSepolia.id) {
    const fromAmount = await publicClient.readContract({
      abi: mockSwapperAbi,
      functionName: "getAmountIn",
      address: parse(Hex, mockSwapperAddress),
      args: [fromToken, toAmount, toToken],
    });
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
  config.set({ integrator: "exa_app", userId: account });
  const { estimate, transactionRequest } = await getContractCallsQuote({
    fee: 0.0025, // TODO review - 0.25% fee
    slippage: 0.02, // TODO review - 2% slippage
    integrator: "exa_app",
    fromChain: optimism.id,
    toChain: optimism.id,
    fromToken: fromToken.toString(),
    toToken: toToken.toString(),
    toAmount: toAmount.toString(),
    fromAddress: account,
    contractCalls: [],
  });
  return { fromAmount: BigInt(estimate.fromAmount), data: parse(Hex, transactionRequest?.data) };
}

// TODO add necessary exports and remove eslint-disable
export { getRoute }; // eslint-disable-line import/prefer-default-export
