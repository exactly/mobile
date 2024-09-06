import { $ } from "execa";
import { anvil } from "prool/instances";
import { createTestClient, http, publicActions, walletActions } from "viem";
import { foundry } from "viem/chains";

export const client = createTestClient({ chain: foundry, mode: "anvil", transport: http() })
  .extend(publicActions)
  .extend(walletActions);

export default async function setup() {
  const instance = anvil({ blockBaseFeePerGas: 1n });
  await instance.start();

  const [deployer] = await client.getAddresses();
  if (!deployer) {
    await instance.stop();
    throw new Error("no anvil account");
  }

  await $({ cwd: "node_modules/@exactly/plugin", env: { OPTIMISM_ETHERSCAN_KEY: "" } })`forge script
    node_modules/webauthn-owner-plugin/script/Plugin.s.sol
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http} --broadcast`;

  return async function teardown() {
    await instance.stop();
  };
}
