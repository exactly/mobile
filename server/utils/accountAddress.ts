import { getEntryPoint } from "@alchemy/aa-core";
import accountInitCode from "@exactly/common/accountInitCode";
import chain from "@exactly/common/chain";
import { type Address, ContractFunctionExecutionError, ContractFunctionRevertedError } from "viem";

import decodePublicKey from "./decodePublicKey";
import publicClient from "./publicClient";

export default async function accountAddress(publicKey: Uint8Array) {
  const { x, y } = decodePublicKey(publicKey);
  const initCode = accountInitCode({ x, y });
  const { address, abi } = getEntryPoint(chain, { version: "0.6.0" });

  try {
    await publicClient.simulateContract({ address, abi, functionName: "getSenderAddress", args: [initCode] }); // TODO calculate locally
    throw new Error("unable to get account address");
  } catch (error: unknown) {
    if (
      error instanceof ContractFunctionExecutionError &&
      error.cause instanceof ContractFunctionRevertedError &&
      error.cause.data?.errorName === "SenderAddressResult" &&
      error.cause.data.args?.length === 1
    ) {
      return error.cause.data.args[0] as Address;
    }
    throw error;
  }
}
