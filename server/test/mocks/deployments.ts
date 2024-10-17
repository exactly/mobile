import { foundry } from "viem/chains";
import { inject, vi } from "vitest";

vi.mock("@exactly/common/generated/chain", async () => ({
  ...(await import("@exactly/common/generated/chain")),
  default: { ...foundry, rpcUrls: { ...foundry.rpcUrls, alchemy: foundry.rpcUrls.default } },
  auditorAddress: inject("Auditor"),
  marketUSDCAddress: inject("MarketUSDC"),
  previewerAddress: inject("Previewer"),
  usdcAddress: inject("USDC"),
  wethAddress: inject("WETH"),
}));
vi.mock("../../generated/contracts", async () => ({
  ...(await import("../../generated/contracts")),
  issuerCheckerAddress: inject("IssuerChecker"),
}));
