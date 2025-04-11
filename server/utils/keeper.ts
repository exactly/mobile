import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { Hash } from "@exactly/common/validation";
import { captureException, startSpan, withScope } from "@sentry/node";
import { setTimeout } from "node:timers/promises";
import { parse } from "valibot";
import {
  BaseError,
  ContractFunctionRevertedError,
  createWalletClient,
  encodeFunctionData,
  getContractError,
  http,
  keccak256,
  nonceManager,
  RawContractError,
  WaitForTransactionReceiptTimeoutError,
  withRetry,
  type MaybePromise,
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
        onHash?: (hash: Hash) => MaybePromise<unknown>;
        ignore?: string[] | ((reason: string) => Promise<TransactionReceipt | boolean | undefined>);
      },
    ) =>
      withScope((scope) =>
        startSpan({ forceTransaction: true, ...spanOptions }, async (span) => {
          try {
            scope.setContext("tx", { call });
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
                const prepared = await startSpan({ name: "prepare transaction", op: "tx.prepare" }, () =>
                  keeper.prepareTransactionRequest({
                    account: keeper.account,
                    chain,
                    to: call.address,
                    data: encodeFunctionData(call),
                    ...txOptions,
                    nonceManager,
                  }),
                );
                scope.setContext("tx", { request, prepared });
                span.setAttribute("tx.nonce", prepared.nonce);
                const serializedTransaction = await startSpan({ name: "sign transaction", op: "tx.sign" }, () =>
                  keeper.signTransaction(prepared),
                );
                const hash = keccak256(serializedTransaction);
                scope.setContext("tx", { request, prepared, hash });
                span.setAttribute("tx.hash", hash);
                try {
                  const controller = new AbortController();
                  const [txReceipt] = await Promise.all([
                    startSpan({ name: "wait for receipt", op: "tx.wait" }, () =>
                      publicClient.waitForTransactionReceipt({ hash, confirmations: 0 }),
                    ).finally(() => {
                      controller.abort();
                    }),
                    (async () => {
                      while (!controller.signal.aborted) {
                        await Promise.allSettled([
                          startSpan({ name: "send transaction", op: "tx.send" }, () =>
                            keeper.sendRawTransaction({ serializedTransaction }),
                          ),
                          setTimeout(6666, null, { signal: controller.signal }),
                        ]);
                      }
                    })(),
                    (async () => {
                      try {
                        await options?.onHash?.(hash);
                      } catch (error) {
                        captureException(error, { level: "error" });
                      }
                    })(),
                  ]);
                  return txReceipt;
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

            span.setStatus({ code: receipt.status === "success" ? 1 : 2, message: receipt.status });
            scope.setContext("tx", { request, receipt });
            const trace = await traceClient.traceTransaction(receipt.transactionHash);
            scope.setContext("tx", { request, receipt, trace });
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
