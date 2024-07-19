import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import { mkdir, writeFile } from "node:fs/promises";
import type { Abi } from "viem";
import { optimismSepolia } from "viem/chains";

import { chain } from "@exactly/common/constants.ts";

const network = { [optimismSepolia.id]: "op-sepolia" }[chain.id] ?? chain.name;

const [auditor, marketUSDC, marketWETH, previewer] = await Promise.all([
  import(`@exactly/protocol/deployments/${network}/Auditor.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketUSDC.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/MarketWETH.json`) as Promise<Deployment>,
  import(`@exactly/protocol/deployments/${network}/Previewer.json`) as Promise<Deployment>,
]);

export default defineConfig({
  out: "src/generated/wagmi.ts",
  contracts: [
    { name: "Auditor", abi: auditor.abi },
    { name: "Market", abi: marketWETH.abi },
    { name: "Previewer", abi: previewer.abi },
  ],
  plugins: [
    react(),
    {
      name: "addresses",
      async run() {
        await mkdir("src/generated", { recursive: true });
        await writeFile(
          "src/generated/addresses.ts",
          `${Object.entries({
            auditor: auditor.address,
            marketUSDC: marketUSDC.address,
            marketWETH: marketWETH.address,
            previewer: previewer.address,
          })
            .map(([key, value]) => `export const ${key} = "${value}" as const;`)
            .join("\n")}\n`,
        );
        return { content: "" };
      },
    },
  ],
});

type Deployment = { address: `0x${string}`; abi: Abi };
