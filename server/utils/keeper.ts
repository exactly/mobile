import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { Hash } from "@exactly/common/validation";
import { captureException, startSpan, withScope } from "@sentry/node";
import { parse } from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  createWalletClient,
  encodeFunctionData,
  getContractError,
  http,
  nonceManager,
  RawContractError,
  WaitForTransactionReceiptTimeoutError,
  withRetry,
  type Prettify,
  type TransactionReceipt,
  type WriteContractParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import publicClient from "./publicClient";
import traceClient from "./traceClient";

if (!chain.rpcUrls.alchemy?.http[0]) throw new Error("missing alchemy rpc url");

export default createWalletClient({
  chain,
  transport: http(`${chain.rpcUrls.alchemy.http[0]}/${alchemyAPIKey}`),
  account: privateKeyToAccount(
    parse(Hash, process.env.KEEPER_PRIVATE_KEY, {
      message: "invalid keeper private key",
    }),
    { nonceManager },
  ),
}).extend(extender);

export function extender(keeper: ReturnType<typeof createWalletClient>) {
  return {
    exaSend: async (
      spanOptions: Prettify<{ name: string; op: string } & Omit<Parameters<typeof startSpan>[0], "name" | "op">>,
      call: Prettify<Pick<WriteContractParameters, "address" | "functionName" | "args" | "abi">>,
      options?: {
        onHash?: (hash: Hash) => Promise<unknown>;
        ignore?: string[] | ((reason: string) => Promise<TransactionReceipt | boolean | undefined>);
      },
    ) =>
      withScope((scope) =>
        startSpan({ forceTransaction: true, ...spanOptions }, async (span) => {
          try {
            span.setAttributes({
              "tx.call": `${call.functionName}(${call.args?.map(String).join(", ") ?? ""})`,
              "tx.from": keeper.account?.address,
              "tx.to": call.address,
            });
            const txOptions = {
              type: "eip1559",
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1_000_000n,
              gas: 5_000_000n,
            } as const;
            const { request: writeRequest } = await startSpan({ name: "eth_call", op: "tx.simulate" }, () =>
              publicClient.simulateContract({
                account: keeper.account,
                ...txOptions,
                ...call,
              }),
            );
            const {
              abi: _,
              account: __,
              address: ___,
              ...request
            } = { from: writeRequest.account.address, to: writeRequest.address, ...writeRequest };
            scope.setContext("tx", { request });

            const receipt = await withRetry(
              async () => {
                const prepare = await startSpan({ name: "prepare transaction", op: "tx.prepare" }, () =>
                  keeper.prepareTransactionRequest({
                    account: keeper.account,
                    chain,
                    to: call.address,
                    data: encodeFunctionData({ abi: call.abi, args: call.args, functionName: call.functionName }),
                    ...txOptions,
                    nonceManager,
                  }),
                );
                scope.setContext("tx", { request, prepare });
                const serializedTransaction = await startSpan({ name: "sign transaction", op: "tx.sign" }, () =>
                  keeper.signTransaction(prepare),
                );
                scope.setContext("tx", { request, prepare, serializedTransaction });
                try {
                  return await withRetry(
                    async () => {
                      const hash = await startSpan({ name: "send transaction", op: "tx.send" }, () =>
                        keeper.sendRawTransaction({ serializedTransaction }),
                      );

                      span.setAttribute("tx.hash", hash);
                      scope.setContext("tx", { hash, request, prepare, serializedTransaction });
                      return await startSpan({ name: "wait for receipt", op: "tx.wait" }, () =>
                        publicClient.waitForTransactionReceipt({ hash }),
                      );
                    },
                    { shouldRetry: ({ error }) => error instanceof WaitForTransactionReceiptTimeoutError },
                  );
                } catch (error) {
                  if (error instanceof WaitForTransactionReceiptTimeoutError && keeper.account) {
                    captureException(new Error("bad nonce"), { level: "fatal" });
                    nonceManager.reset({ address: keeper.account.address, chainId: chain.id });
                  }
                  throw error;
                }
              },
              { retryCount: 1, shouldRetry: ({ error }) => error instanceof WaitForTransactionReceiptTimeoutError },
            );

            const hash = receipt.transactionHash;
            await options?.onHash?.(hash);
            span.setStatus({ code: receipt.status === "success" ? 1 : 2, message: receipt.status });
            scope.setContext("tx", { hash, request, receipt });
            const trace = await traceClient.traceTransaction(hash);
            scope.setContext("tx", { hash, request, receipt, trace });
            if (receipt.status !== "success") {
              // eslint-disable-next-line @typescript-eslint/only-throw-error -- returns error
              throw getContractError(new RawContractError({ data: trace.output }), { ...call, args: call.args ?? [] });
            }
            return receipt;
          } catch (error: unknown) {
            if (options?.ignore) {
              const reason =
                error instanceof BaseError &&
                error.cause instanceof ContractFunctionRevertedError &&
                error.cause.data?.errorName
                  ? `${error.cause.data.errorName}(${error.cause.data.args?.map(String).join(",") ?? ""})`
                  : error instanceof Error
                    ? error.message
                    : String(error);
              if (typeof options.ignore === "function") {
                const ignore = await options.ignore(reason);
                if (ignore === true) return null;
                if (ignore) return ignore;
              } else if (options.ignore.includes(reason)) return null;
            }
            span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
            captureException(error, { level: "error" });
            throw error;
          }
        }),
      ),
  };
}
