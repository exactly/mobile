import "dotenv/config";
import { defineConfig, type Plugin } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { type Abi, getAddress, zeroAddress } from "viem";
import { optimism, optimismSepolia } from "viem/chains";

const easBuild = process.env.EAS_BUILD_RUNNER === "eas-build";

const chainId = Number(process.env.CHAIN_ID ?? String(easBuild ? optimism.id : optimismSepolia.id));

if (easBuild) {
  execSync(
    "export FOUNDRY_DIR=${FOUNDRY_DIR-$HOME/workingdir} && curl -L https://foundry.paradigm.xyz | bash || true && foundryup",
  );
}

const auditor = loadDeployment("Auditor");
const marketUSDC = loadDeployment("MarketUSDC");
const marketWETH = loadDeployment("MarketWETH");
const previewer = loadDeployment("Previewer");
const ratePreviewer = loadDeployment("RatePreviewer");
const usdc = loadDeployment("USDC");
const weth = loadDeployment("WETH");
const [exaPlugin, , factory] = loadBroadcast("Deploy").transactions;
const [issuerChecker] = loadBroadcast("IssuerChecker").transactions;
const [installmentsPreviewer] = loadBroadcast("InstallmentsPreviewer").transactions;
const [, mockSwapper] =
  chainId === optimismSepolia.id ? loadBroadcast("Mocks").transactions : [{}, { contractAddress: zeroAddress }];
if (!exaPlugin || !factory || !issuerChecker || !installmentsPreviewer) throw new Error("missing contracts");

export default defineConfig([
  {
    out: "src/generated/contracts.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi },
      { name: "Market", abi: marketWETH.abi },
      { name: "Previewer", abi: previewer.abi },
      { name: "RatePreviewer", abi: ratePreviewer.abi },
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
    plugins: [
      addresses({
        auditor: auditor.address,
        exaAccountFactory: factory.contractAddress,
        exaPlugin: exaPlugin.contractAddress,
        installmentsPreviewer: installmentsPreviewer.contractAddress,
        marketUSDC: marketUSDC.address,
        marketWETH: marketWETH.address,
        mockSwapper: mockSwapper.contractAddress,
        previewer: previewer.address,
        ratePreviewer: ratePreviewer.address,
        usdc: usdc.address,
        weth: weth.address,
      }),
      foundry({
        project: "contracts",
        include: [
          "ExaAccountFactory.sol/ExaAccountFactory.json",
          "ExaPlugin.sol/ExaPlugin.json",
          "InstallmentsPreviewer.sol/InstallmentsPreviewer.json",
          "MockSwapper.sol/MockSwapper.json",
          "UpgradeableModularAccount.sol/UpgradeableModularAccount.json",
        ],
      }),
      chain(),
    ],
  },
  {
    out: "server/generated/contracts.ts",
    contracts: [
      { name: "Auditor", abi: auditor.abi },
      { name: "Market", abi: marketWETH.abi },
      { name: "Previewer", abi: previewer.abi },
    ],
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

function loadDeployment(contract: string) {
  return JSON.parse(
    readFileSync(
      `node_modules/@exactly/protocol/deployments/${chainId === optimism.id ? "optimism" : "op-sepolia"}/${contract}.json`,
      "utf8",
    ),
  ) as { address: string; abi: Abi };
}

function loadBroadcast(script: string) {
  return JSON.parse(
    readFileSync(`node_modules/@exactly/plugin/broadcast/${script}.s.sol/${chainId}/run-latest.json`, "utf8"),
  ) as { transactions: { contractAddress: string }[] };
}
