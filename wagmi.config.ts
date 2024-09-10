import { defineConfig, type Plugin } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";
import { type Abi, getAddress } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

const chainId = Number(process.env.CHAIN_ID ?? String(optimismSepolia.id));

const [
  { default: auditor },
  { default: marketUSDC },
  { default: marketWETH },
  { default: previewer },
  { default: usdc },
  { default: weth },
  {
    default: {
      transactions: [exaPlugin, factory],
    },
  },
  {
    default: {
      transactions: [issuerChecker],
    },
  },
] = await Promise.all(
  (() => {
    switch (chainId) {
      case optimism.id:
        return [
          import("@exactly/protocol/deployments/optimism/Auditor.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/optimism/MarketUSDC.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/optimism/MarketWETH.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/optimism/Previewer.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/optimism/USDC.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/optimism/WETH.json", { with: { type: "json" } }),
          import("@exactly/plugin/broadcast/Deploy.s.sol/10/run-latest.json", { with: { type: "json" } }),
          import("@exactly/plugin/broadcast/IssuerChecker.s.sol/10/run-latest.json", { with: { type: "json" } }),
        ];
      case optimismSepolia.id:
        return [
          import("@exactly/protocol/deployments/op-sepolia/Auditor.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/op-sepolia/MarketUSDC.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/op-sepolia/MarketWETH.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/op-sepolia/Previewer.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/op-sepolia/USDC.json", { with: { type: "json" } }),
          import("@exactly/protocol/deployments/op-sepolia/WETH.json", { with: { type: "json" } }),
          import("@exactly/plugin/broadcast/Deploy.s.sol/11155420/run-latest.json", { with: { type: "json" } }),
          import("@exactly/plugin/broadcast/IssuerChecker.s.sol/11155420/run-latest.json", { with: { type: "json" } }),
        ];
      default:
        throw new Error("unknown chain");
    }
  })(),
);

if (!exaPlugin || !factory || !issuerChecker) throw new Error("missing contracts");

export default defineConfig([
  {
    out: "src/generated/contracts.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi as Abi },
      { name: "Market", abi: marketWETH.abi as Abi },
      { name: "Previewer", abi: previewer.abi as Abi },
    ],
    plugins: [
      foundry({
        project: "contracts",
        include: ["ExaPlugin.sol/ExaPlugin.json", "UpgradeableModularAccount.sol/UpgradeableModularAccount.json"],
      }),
      react(),
    ],
  },
  {
    out: "common/generated/chain.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi as Abi },
      { name: "Market", abi: marketWETH.abi as Abi },
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
        include: [
          "ExaAccountFactory.sol/ExaAccountFactory.json",
          "ExaPlugin.sol/ExaPlugin.json",
          "UpgradeableModularAccount.sol/UpgradeableModularAccount.json",
        ],
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
  if (!importName) throw new Error("unknown chain");
  return { name: "Chain", run: () => ({ content: `export { ${importName} as default } from "@alchemy/aa-core"` }) };
}
