import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain, { exaPluginAbi } from "@exactly/common/generated/chain";
import { createWalletClient, http, keccak256, nonceManager, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { inject, vi } from "vitest";

import anvilClient from "../anvilClient";

const account = privateKeyToAccount(generatePrivateKey(), { nonceManager });
await anvilClient.writeContract({
  account: null,
  address: inject("ExaPlugin"),
  abi: exaPluginAbi,
  functionName: "grantRole",
  args: [keccak256(toHex("KEEPER_ROLE")), account.address],
});
await anvilClient.setBalance({ address: account.address, value: 10n ** 24n });

vi.mock("../../utils/keeper", () => ({
  default: createWalletClient({
    chain,
    transport: http(`${chain.rpcUrls.alchemy?.http[0]}/${alchemyAPIKey}`),
    account,
  }),
}));
