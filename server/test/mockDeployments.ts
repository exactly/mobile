import { foundry } from "viem/chains";
import { inject, vi } from "vitest";

vi.mock("@exactly/common/generated/chain", async () => ({
  ...(await import("@exactly/common/generated/chain")),
  default: { ...foundry, rpcUrls: { ...foundry.rpcUrls, alchemy: foundry.rpcUrls.default } },
  marketUSDCAddress: inject("MarketUSDC"),
  previewerAddress: inject("Previewer"),
  usdcAddress: inject("USDC"),
}));
vi.mock("../generated/contracts", async () => ({
  ...(await import("../generated/contracts")),
  issuerCheckerAddress: inject("IssuerChecker"),
}));
