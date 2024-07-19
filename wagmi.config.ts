import Auditor from "@exactly/protocol/deployments/op-sepolia/Auditor.json" with { type: "json" };
import Market from "@exactly/protocol/deployments/op-sepolia/MarketWETH.json" with { type: "json" };
import Previewer from "@exactly/protocol/deployments/op-sepolia/Previewer.json" with { type: "json" };
import { defineConfig } from "@wagmi/cli";
import { react } from "@wagmi/cli/plugins";
import type { Abi } from "viem";

export default defineConfig({
  out: "src/generated/wagmi.ts",
  contracts: [
    { name: "Auditor", abi: Auditor.abi as Abi },
    { name: "Market", abi: Market.abi as Abi },
    { name: "Previewer", abi: Previewer.abi as Abi },
  ],
  plugins: [react()],
});
