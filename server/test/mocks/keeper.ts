import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import path from "node:path";
import { createWalletClient, http, keccak256, nonceManager, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { expect, vi } from "vitest";

vi.mock("../../utils/keeper", async () => {
  const { default: _, ...original } = await import("../../utils/keeper");
  return {
    default: createWalletClient({
      chain,
      transport: http(`${chain.rpcUrls.alchemy?.http[0]}/${alchemyAPIKey}`),
      account: privateKeyToAccount(
        keccak256(toBytes(path.relative(path.resolve(__dirname, ".."), expect.getState().testPath ?? ""))), // eslint-disable-line unicorn/prefer-module
        { nonceManager },
      ),
    }),
    ...original,
  };
});
