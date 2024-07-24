import { defineConfig, type Plugin } from "@wagmi/cli";
import { actions, foundry, react } from "@wagmi/cli/plugins";
import { type Abi, type Address, getAddress } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

import chain from "@exactly/common/chain.ts";

const network = { [optimism.id]: "optimism", [optimismSepolia.id]: "op-sepolia" }[chain.id] ?? chain.name;

const [
  auditor,
  marketUSDC,
  marketWETH,
  previewer,
  {
    transactions: [exaPlugin, factory],
  },
] = await Promise.all([
  import(`@exactly/protocol/deployments/${network}/Auditor.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketUSDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketWETH.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/Previewer.json`) as Promise<Deployment>,
  import(`@exactly/plugin/broadcast/Deploy.s.sol/${String(chain.id)}/run-latest.json`) as Promise<DeployBroadcast>,
]);

export default defineConfig([
  {
    out: "src/generated/contracts.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi },
      { name: "Market", abi: marketWETH.abi },
      { name: "Previewer", abi: previewer.abi },
    ],
    plugins: [
      addresses({
        auditor: auditor.address,
        marketUSDC: marketUSDC.address,
        marketWETH: marketWETH.address,
        previewer: previewer.address,
      }),
      actions(),
      react(),
    ],
  },
  {
    out: "server/generated/contracts.ts",
    plugins: [
      addresses({
        marketUSDC: marketUSDC.address,
        exaPlugin: getAddress(exaPlugin.contractAddress),
      }),
      foundry({ project: "contracts", include: ["IExaAccount.sol/**"] }),
    ],
  },
  {
    out: "common/generated/contracts.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi },
      { name: "Market", abi: marketWETH.abi },
    ],
    plugins: [
      addresses({ exaAccountFactory: getAddress(factory.contractAddress) }),
      foundry({ project: "contracts", include: ["ExaAccountFactory.sol/**"] }),
    ],
  },
]);

function addresses(contracts: Record<string, Address>): Plugin {
  return {
    name: "Addresses",
    run: () => ({
      content: `${Object.entries(contracts)
        .map(([key, value]) => `export const ${key}Address = "${getAddress(value)}" as const;`)
        .join("\n")}\n`,
    }),
  };
}

type Deployment = { address: Address; abi: Abi };
type ContractTransaction = { contractName: string; contractAddress: string };
type DeployBroadcast = { transactions: [ContractTransaction, ContractTransaction] };
