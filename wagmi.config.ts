import { defineConfig, type Plugin } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";
import { type Abi, getAddress } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

const chainId = Number(process.env.CHAIN_ID ?? "11155420");

const network = { [optimism.id]: "optimism", [optimismSepolia.id]: "op-sepolia" }[chainId];
if (!network) throw new Error("unknown chain id");

const [
  auditor,
  marketUSDC,
  marketWETH,
  previewer,
  usdc,
  weth,
  {
    transactions: [issuerChecker, exaPlugin, factory],
  },
] = await Promise.all([
  import(`@exactly/protocol/deployments/${network}/Auditor.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketUSDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketWETH.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/Previewer.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/USDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/WETH.json`) as Promise<Deployment>,
  import(`@exactly/plugin/broadcast/Deploy.s.sol/${String(chainId)}/run-latest.json`) as Promise<DeployBroadcast>,
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
      foundry({
        project: "contracts",
        include: [
          "ExaPlugin.sol/ExaPlugin.json",
          "IAccountLoupe.sol/IAccountLoupe.json",
          "UpgradeableModularAccount.sol/UpgradeableModularAccount.json",
        ],
      }),
      react(),
    ],
  },
  {
    out: "common/generated/chain.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi },
      { name: "Market", abi: marketWETH.abi },
    ],
    plugins: [
      addresses({
        auditor: auditor.address,
        exaAccountFactory: factory.contractAddress,
        exaPlugin: exaPlugin.contractAddress,
        marketUSDC: marketUSDC.address,
        marketWETH: marketWETH.address,
        previewer: previewer.address,
        usdc: usdc.address,
        weth: weth.address,
      }),
      foundry({
        project: "contracts",
        include: ["ExaAccountFactory.sol/ExaAccountFactory.json", "ExaPlugin.sol/ExaPlugin.json"],
      }),
      chain(),
    ],
  },
  {
    out: "server/generated/contracts.ts",
    plugins: [
      addresses({ issuerChecker: issuerChecker.contractAddress }),
      foundry({ project: "contracts", include: ["IssuerChecker.sol/IssuerChecker.json"] }),
    ],
  },
]);

function addresses(contracts: Record<string, string>): Plugin {
  return {
    name: "Addresses",
    run: () => ({
      content: `${Object.entries(contracts)
        .map(([key, value]) => `export const ${key}Address = "${getAddress(value)}" as const`)
        .join("\n")}\n`,
    }),
  };
}

function chain(): Plugin {
  const importName = { [optimism.id]: "optimism", [optimismSepolia.id]: "optimismSepolia" }[chainId];
  if (!importName) throw new Error("unknown chain id");
  return { name: "Chain", run: () => ({ content: `export { ${importName} as default } from "@alchemy/aa-core"` }) };
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
  transactions: [ContractTransaction, ContractTransaction, ContractTransaction];
}
