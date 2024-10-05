import type { GlobalSetupContext } from "vitest/node";

import { Address } from "@exactly/common/validation";
import { $ } from "execa";
import { anvil } from "prool/instances";
import { literal, null_, object, parse, tuple } from "valibot";
import { padHex, zeroAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { foundry } from "viem/chains";

import anvilClient from "./anvilClient";

export default async function setup({ provide }: GlobalSetupContext) {
  const instance = anvil({ blockBaseFeePerGas: 1n, codeSizeLimit: 42_000 });
  const initialize = await instance
    .start()
    .then(() => true)
    .catch(() => false);

  const keeperAddress = privateKeyToAddress(padHex("0x69"));
  if (initialize) await anvilClient.setBalance({ address: keeperAddress, value: 10n ** 24n });

  const shell = {
    cwd: "node_modules/@exactly/plugin",
    env: {
      COLLECTOR_ADDRESS: privateKeyToAddress(padHex("0x666")),
      ISSUER_ADDRESS: privateKeyToAddress(padHex("0x420")),
      KEEPER_ADDRESS: keeperAddress,
      OPTIMISM_ETHERSCAN_KEY: "",
    } as Record<string, string>,
  };
  const deployer = await anvilClient
    .getAddresses()
    .then(([address]) => address ?? zeroAddress)
    .catch(() => zeroAddress);

  if (initialize) {
    await $(shell)`forge script test/mocks/Account.s.sol --code-size-limit 42000
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
    await $(shell)`forge script node_modules/webauthn-owner-plugin/script/Plugin.s.sol
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
    shell.env.OWNER_PLUGIN_ADDRESS = parse(
      object({
        transactions: tuple([object({ contractAddress: Address, contractName: literal("WebauthnOwnerPlugin") })]),
      }),
      await import(`@exactly/plugin/broadcast/Plugin.s.sol/${foundry.id}/run-latest.json`),
    ).transactions[0].contractAddress;
    await $(shell)`forge script test/mocks/Protocol.s.sol --code-size-limit 42000
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  }

  // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  const [, auditor, , , , , , , , , , usdc, , marketUSDC, , , , , , , , marketWETH, , , , , , previewer, balancer] =
    parse(
      Protocol,
      await import(`@exactly/plugin/broadcast/Protocol.s.sol/${foundry.id}/run-latest.json`),
    ).transactions;

  if (initialize) {
    shell.env.PROTOCOL_AUDITOR_ADDRESS = auditor.contractAddress;
    shell.env.PROTOCOL_MARKETUSDC_ADDRESS = marketUSDC.contractAddress;
    shell.env.PROTOCOL_MARKETWETH_ADDRESS = marketWETH.contractAddress;
    shell.env.PROTOCOL_BALANCERVAULT_ADDRESS = balancer.contractAddress;
    shell.env.PROTOCOL_VELODROMEPOOLFACTORY_ADDRESS = padHex("0x123", { size: 20 });
    await $(shell)`forge script script/IssuerChecker.s.sol
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  }

  const [issuerChecker] = parse(
    object({
      transactions: tuple([object({ contractAddress: Address, contractName: literal("IssuerChecker") })]),
    }),
    await import(`@exactly/plugin/broadcast/IssuerChecker.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    shell.env.ISSUER_CHECKER_ADDRESS = issuerChecker.contractAddress;
    await $(shell)`forge script script/Deploy.s.sol
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  }

  const [exaPlugin, exaAccountFactory] = parse(
    object({
      transactions: tuple([
        object({ contractAddress: Address, contractName: literal("ExaPlugin") }),
        object({ contractAddress: Address, contractName: literal("ExaAccountFactory") }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Deploy.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  provide("ExaAccountFactory", exaAccountFactory.contractAddress);
  provide("ExaPlugin", exaPlugin.contractAddress);
  provide("IssuerChecker", issuerChecker.contractAddress);
  provide("MarketUSDC", marketUSDC.contractAddress);
  provide("MarketWETH", marketWETH.contractAddress);
  provide("Previewer", previewer.contractAddress);
  provide("USDC", usdc.contractAddress);

  return async function teardown() {
    await instance.stop();
  };
}

const Protocol = object({
  transactions: tuple([
    object({ contractName: literal("Auditor"), transactionType: literal("CREATE") }),
    object({ contractAddress: Address, contractName: literal("ERC1967Proxy"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractAddress: Address, contractName: null_(), transactionType: literal("CREATE") }),
    object({ contractName: literal("Market"), transactionType: literal("CREATE") }),
    object({ contractAddress: Address, contractName: literal("ERC1967Proxy"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("InterestRateModel"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("MockPriceFeed"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractAddress: Address, contractName: null_(), transactionType: literal("CREATE") }),
    object({ contractName: literal("Market"), transactionType: literal("CREATE") }),
    object({ contractAddress: Address, contractName: literal("ERC1967Proxy"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("InterestRateModel"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("MockPriceFeed"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractAddress: Address, contractName: literal("MockWETH"), transactionType: literal("CREATE") }),
    object({ contractName: literal("Market"), transactionType: literal("CREATE") }),
    object({ contractAddress: Address, contractName: literal("ERC1967Proxy"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("InterestRateModel"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractName: literal("MockPriceFeed"), transactionType: literal("CREATE") }),
    object({ transactionType: literal("CALL") }),
    object({ contractAddress: Address, contractName: literal("Previewer"), transactionType: literal("CREATE") }),
    object({
      contractAddress: Address,
      contractName: literal("MockBalancerVault"),
      transactionType: literal("CREATE"),
    }),
  ]),
});

declare module "vitest" {
  export interface ProvidedContext {
    ExaAccountFactory: Address;
    ExaPlugin: Address;
    IssuerChecker: Address;
    MarketUSDC: Address;
    MarketWETH: Address;
    Previewer: Address;
    USDC: Address;
  }
}
