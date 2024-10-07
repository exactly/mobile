import { Address } from "@exactly/common/validation";
import { $ } from "execa";
import { anvil } from "prool/instances";
import { literal, null_, object, parse, tuple } from "valibot";
import { padHex, zeroAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { foundry } from "viem/chains";
import type { GlobalSetupContext } from "vitest/node";

import anvilClient from "./anvilClient";

export default async function setup({ provide }: GlobalSetupContext) {
  const instance = anvil({ codeSizeLimit: 42_000, blockBaseFeePerGas: 1n });
  const initialize = await instance
    .start()
    .then(() => true)
    .catch(() => false);

  const keeperAddress = privateKeyToAddress(padHex("0x69"));
  if (initialize) await anvilClient.setBalance({ address: keeperAddress, value: 10n ** 24n });

  const shell = {
    cwd: "node_modules/@exactly/plugin",
    env: {
      OPTIMISM_ETHERSCAN_KEY: "",
      COLLECTOR_ADDRESS: privateKeyToAddress(padHex("0x666")),
      ISSUER_ADDRESS: privateKeyToAddress(padHex("0x420")),
      KEEPER_ADDRESS: keeperAddress,
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
        transactions: tuple([object({ contractName: literal("WebauthnOwnerPlugin"), contractAddress: Address })]),
      }),
      await import(`@exactly/plugin/broadcast/Plugin.s.sol/${foundry.id}/run-latest.json`),
    ).transactions[0].contractAddress;
    await $(shell)`forge script test/mocks/Protocol.s.sol --code-size-limit 42000
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow`;
  }

  // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  const [, auditor, , , , , , , , , , usdc, , marketUSDC, , , , , , weth, , marketWETH, , , , , , previewer, balancer] =
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
      transactions: tuple([object({ contractName: literal("IssuerChecker"), contractAddress: Address })]),
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
        object({ contractName: literal("ExaPlugin"), contractAddress: Address }),
        object({ contractName: literal("ExaAccountFactory"), contractAddress: Address }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Deploy.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  provide("Auditor", auditor.contractAddress);
  provide("ExaAccountFactory", exaAccountFactory.contractAddress);
  provide("ExaPlugin", exaPlugin.contractAddress);
  provide("IssuerChecker", issuerChecker.contractAddress);
  provide("MarketUSDC", marketUSDC.contractAddress);
  provide("MarketWETH", marketWETH.contractAddress);
  provide("Previewer", previewer.contractAddress);
  provide("USDC", usdc.contractAddress);
  provide("WETH", weth.contractAddress);

  return async function teardown() {
    await instance.stop();
  };
}

const Protocol = object({
  transactions: tuple([
    object({ transactionType: literal("CREATE"), contractName: literal("Auditor") }),
    object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: null_(), contractAddress: Address }),
    object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
    object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("InterestRateModel") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: null_(), contractAddress: Address }),
    object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
    object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("InterestRateModel") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockWETH"), contractAddress: Address }),
    object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
    object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("InterestRateModel") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("Previewer"), contractAddress: Address }),
    object({
      transactionType: literal("CREATE"),
      contractName: literal("MockBalancerVault"),
      contractAddress: Address,
    }),
  ]),
});

declare module "vitest" {
  export interface ProvidedContext {
    Auditor: Address;
    ExaAccountFactory: Address;
    ExaPlugin: Address;
    IssuerChecker: Address;
    MarketUSDC: Address;
    MarketWETH: Address;
    Previewer: Address;
    USDC: Address;
    WETH: Address;
  }
}
