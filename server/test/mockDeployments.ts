import { foundry } from "viem/chains";
import { inject, vi } from "vitest";

vi.mock("@exactly/common/generated/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@exactly/common/generated/chain")>()), // eslint-disable-line @typescript-eslint/consistent-type-imports
  default: { ...foundry, rpcUrls: { ...foundry.rpcUrls, alchemy: foundry.rpcUrls.default } },
  usdcAddress: inject("USDC"),
  marketUSDCAddress: inject("MarketUSDC"),
}));
vi.mock("../generated/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../generated/contracts")>()), // eslint-disable-line @typescript-eslint/consistent-type-imports
  issuerCheckerAddress: inject("IssuerChecker"),
}));
