import auditor from "@exactly/protocol/deployments/op-sepolia/Auditor.json" with { type: "json" };
import marketUSDC from "@exactly/protocol/deployments/op-sepolia/MarketUSDC.json" with { type: "json" };
import marketWETH from "@exactly/protocol/deployments/op-sepolia/MarketWETH.json" with { type: "json" };
import previewer from "@exactly/protocol/deployments/op-sepolia/Previewer.json" with { type: "json" };
import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import { mkdir, writeFile } from "node:fs/promises";
import type { Abi } from "viem";

export default defineConfig({
  out: "src/generated/wagmi.ts",
  contracts: [
    { name: "Auditor", abi: auditor.abi as Abi },
    { name: "Market", abi: marketWETH.abi as Abi },
    { name: "Previewer", abi: previewer.abi as Abi },
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
