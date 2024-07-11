import deployments from "@exactly/plugin/broadcast/Deploy.s.sol/11155420/run-1720660063.json" with { type: "json" };
import { concatHex, encodeFunctionData, getAddress, type Hash } from "viem";

if (!deployments.transactions[1]) throw new Error("no factory deployment found");
const factoryAddress = getAddress(deployments.transactions[1].contractAddress);

export default function accountInitCode({ x, y }: { x: Hash; y: Hash }) {
  return concatHex([
    factoryAddress,
    encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "createAccount",
          inputs: [
            { type: "uint256", name: "salt" },
            { type: "tuple[]", name: "owners", components: [{ type: "uint256" }, { type: "uint256" }] },
          ],
        },
      ],
      args: [0, [[x, y]]],
    }),
  ]);
}
