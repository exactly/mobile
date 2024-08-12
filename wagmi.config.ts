import chain from "@exactly/common/chain";
import { defineConfig, type Plugin } from "@wagmi/cli";
import { actions, foundry, react } from "@wagmi/cli/plugins";
import { type Abi, getAddress } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

const network = { [optimism.id]: "optimism", [optimismSepolia.id]: "op-sepolia" }[chain.id] ?? chain.name;

const [
  auditor,
  marketUSDC,
  marketWETH,
  previewer,
  usdc,
  {
    transactions: [exaPlugin, factory],
  },
] = await Promise.all([
  import(`@exactly/protocol/deployments/${network}/Auditor.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketUSDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketWETH.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/Previewer.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/USDC.json`) as Promise<Deployment>,
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
        usdc: usdc.address,
      }),
      actions(),
      react(),
    ],
  },
  {
    out: "server/generated/contracts.ts",
    plugins: [
      addresses({ exaPlugin: exaPlugin.contractAddress, marketUSDC: marketUSDC.address, usdc: usdc.address }),
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
      addresses({ exaAccountFactory: factory.contractAddress }),
      foundry({ project: "contracts", include: ["ExaAccountFactory.sol/**"] }),
    ],
  },
]);

function addresses(contracts: Record<string, string>): Plugin {
  return {
    name: "Addresses",
    run: () => ({
      content: `${Object.entries(contracts)
        .map(([key, value]) => `export const ${key}Address = "${getAddress(value)}" as const;`)
        .join("\n")}\n`,
    }),
  };
}

interface Deployment {
  address: string;
  abi: Abi;
}
interface ContractTransaction {
  contractName: string;
  contractAddress: string;
}
interface DeployBroadcast {
  transactions: [ContractTransaction, ContractTransaction];
}
