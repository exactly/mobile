import { concatHex, encodeFunctionData, hexToBigInt, type Hash } from "viem";

import { exaAccountFactoryAbi, exaAccountFactoryAddress } from "./generated/chain";

export default function accountInitCode({ x, y }: { x: Hash; y: Hash }) {
  return concatHex([
    exaAccountFactoryAddress,
    encodeFunctionData({
      abi: exaAccountFactoryAbi,
      functionName: "createAccount",
      args: [0n, [{ x: hexToBigInt(x), y: hexToBigInt(y) }]],
    }),
  ]);
}
