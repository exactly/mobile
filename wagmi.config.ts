import { defineConfig, type Plugin } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";
import { type Abi, type Address, getAddress, type Hex } from "viem";
import { optimismSepolia } from "viem/chains";

import { chain } from "@exactly/common/constants.ts";

const network = { [optimismSepolia.id]: "op-sepolia" }[chain.id] ?? chain.name;

const [auditor, marketUSDC, marketWETH, previewer, broadcast] = await Promise.all([
  import(`@exactly/protocol/deployments/${network}/Auditor.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketUSDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketWETH.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/Previewer.json`) as Promise<Deployment>,
  import(`@exactly/plugin/broadcast/Deploy.s.sol/${String(chain.id)}/run-latest.json`) as Promise<Broadcast>,
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
      react(),
    ],
  },
  {
    out: "server/generated/contracts.ts",
    plugins: [
      addresses({
        marketUSDC: marketUSDC.address,
        ...Object.fromEntries(
          broadcast.transactions
            .filter(({ contractName, contractAddress }) => contractName && contractAddress)
            .map(({ contractName, contractAddress }) => [contractName!, contractAddress!]), // eslint-disable-line @typescript-eslint/no-non-null-assertion -- already filtered
        ),
      }),
      foundry({ project: "contracts", include: ["IExaAccount.sol/**"] }),
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

type Broadcast = { transactions: { contractName?: string; contractAddress?: Hex }[] };
type Deployment = { address: Address; abi: Abi };
