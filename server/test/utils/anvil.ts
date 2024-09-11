import { Address } from "@exactly/common/types";
import { $ } from "execa";
import { anvil } from "prool/instances";
import { literal, null_, object, parse, tuple } from "valibot";
import { padHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { foundry } from "viem/chains";
import type { GlobalSetupContext } from "vitest/node";

import anvilClient from "./anvilClient";

export default async function setup({ provide }: GlobalSetupContext) {
  const instance = anvil({ codeSizeLimit: 42_000, blockBaseFeePerGas: 1n });
  await instance.start();

  const [deployer] = await anvilClient.getAddresses();
  if (!deployer) {
    await instance.stop();
    throw new Error("no anvil account");
  }

  const keeperAddress = privateKeyToAddress(padHex("0x69"));
  await anvilClient.setBalance({ address: keeperAddress, value: 10n ** 24n });

  const shell = {
    cwd: "node_modules/@exactly/plugin",
    env: {
      OPTIMISM_ETHERSCAN_KEY: "",
      COLLECTOR_ADDRESS: privateKeyToAddress(padHex("0x666")),
      ISSUER_ADDRESS: privateKeyToAddress(padHex("0x420")),
      KEEPER_ADDRESS: keeperAddress,
    } as Record<string, string>,
  };

  await $(shell)`forge script test/mocks/Account.s.sol --code-size-limit 42000
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;

  await $(shell)`forge script node_modules/webauthn-owner-plugin/script/Plugin.s.sol
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  shell.env.OWNER_PLUGIN_ADDRESS = parse(
    object({
      transactions: tuple([object({ contractName: literal("WebauthnOwnerPlugin"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/Plugin.s.sol/${String(foundry.id)}/run-latest.json`),
  ).transactions[0].contractAddress;

  await $(shell)`forge script test/mocks/Protocol.s.sol --code-size-limit 42000
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  const [, auditor, , , , , , , , , usdc, , marketUSDC, , , , balancer] = parse(
    object({
      transactions: tuple([
        object({ transactionType: literal("CREATE"), contractName: literal("Auditor") }),
        object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
        object({ transactionType: literal("CALL") }),
        object({ transactionType: literal("CREATE"), contractName: literal("MockInterestRateModel") }),
        object({ transactionType: literal("CREATE"), contractName: null_(), contractAddress: Address }),
        object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
        object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
        object({ transactionType: literal("CALL") }),
        object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
        object({ transactionType: literal("CALL") }),
        object({ transactionType: literal("CREATE"), contractName: null_(), contractAddress: Address }),
        object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
        object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
        object({ transactionType: literal("CALL") }),
        object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
        object({ transactionType: literal("CALL") }),
        object({
          transactionType: literal("CREATE"),
          contractName: literal("MockBalancerVault"),
          contractAddress: Address,
        }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Protocol.s.sol/${String(foundry.id)}/run-latest.json`),
  ).transactions;
  shell.env.PROTOCOL_AUDITOR_ADDRESS = auditor.contractAddress;
  shell.env.PROTOCOL_MARKETUSDC_ADDRESS = marketUSDC.contractAddress;
  shell.env.PROTOCOL_BALANCERVAULT_ADDRESS = balancer.contractAddress;
  shell.env.PROTOCOL_VELODROMEPOOLFACTORY_ADDRESS = padHex("0x123", { size: 20 });

  await $(shell)`forge script script/IssuerChecker.s.sol
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  const [issuerChecker] = parse(
    object({
      transactions: tuple([object({ contractName: literal("IssuerChecker"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/IssuerChecker.s.sol/${String(foundry.id)}/run-latest.json`),
  ).transactions;
  shell.env.ISSUER_CHECKER_ADDRESS = issuerChecker.contractAddress;

  await $(shell)`forge script script/Deploy.s.sol
    --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  const [exaPlugin, exaAccountFactory] = parse(
    object({
      transactions: tuple([
        object({ contractName: literal("ExaPlugin"), contractAddress: Address }),
        object({ contractName: literal("ExaAccountFactory"), contractAddress: Address }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Deploy.s.sol/${String(foundry.id)}/run-latest.json`),
  ).transactions;

  provide("USDC", usdc.contractAddress);
  provide("MarketUSDC", marketUSDC.contractAddress);
  provide("IssuerChecker", issuerChecker.contractAddress);
  provide("ExaPlugin", exaPlugin.contractAddress);
  provide("ExaAccountFactory", exaAccountFactory.contractAddress);

  return async function teardown() {
    await instance.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    ExaAccountFactory: Address;
    ExaPlugin: Address;
    IssuerChecker: Address;
    MarketUSDC: Address;
    USDC: Address;
  }
}
