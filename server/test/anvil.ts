import { exaPluginAbi } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { $ } from "execa";
import { readdir } from "node:fs/promises";
import { anvil } from "prool/instances";
import { literal, object, parse, tuple } from "valibot";
import { keccak256, padHex, toBytes, toHex, zeroAddress } from "viem";
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts";
import { foundry } from "viem/chains";
import type { TestProject } from "vitest/node";

import anvilClient from "./anvilClient";

export default async function setup({ provide }: TestProject) {
  const instance = anvil({ codeSizeLimit: 69_000, blockBaseFeePerGas: 1n });
  const initialize = await instance
    .start()
    .then(() => true)
    .catch(() => false);

  const keeper = privateKeyToAccount(padHex("0x69"));
  if (initialize) await anvilClient.setBalance({ address: keeper.address, value: 10n ** 24n });

  const deployer = await anvilClient
    .getAddresses()
    .then(([address]) => address ?? zeroAddress)
    .catch(() => zeroAddress);
  const shell = {
    cwd: "node_modules/@exactly/plugin",
    env: {
      OPTIMISM_ETHERSCAN_KEY: "",
      ISSUER_ADDRESS: privateKeyToAddress(padHex("0x420")),
      KEEPER_ADDRESS: keeper.address,
      DEPLOYER_ADDRESS: deployer,
      ADMIN_ADDRESS: deployer,
    } as Record<string, string>,
  };

  if (initialize) {
    await $(shell)`forge script test/mocks/Account.s.sol --code-size-limit 69000
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script node_modules/webauthn-owner-plugin/script/Plugin.s.sol
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    // cspell:disable-next-line
    shell.env.BROADCAST_WEBAUTHNOWNERPLUGIN_ADDRESS = parse(
      object({
        transactions: tuple([object({ contractName: literal("WebauthnOwnerPlugin"), contractAddress: Address })]),
      }),
      await import(`@exactly/plugin/broadcast/Plugin.s.sol/${foundry.id}/run-latest.json`),
    ).transactions[0].contractAddress;
    await $(shell)`forge script test/mocks/Protocol.s.sol --code-size-limit 69000
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const protocol = parse(
    Protocol,
    await import(`@exactly/plugin/broadcast/Protocol.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  const auditor = protocol[1];
  const exa = protocol[3];
  const marketEXA = protocol[5];
  const usdc = protocol[11];
  const marketUSDC = protocol[13];
  const weth = protocol[19];
  const marketWETH = protocol[21];
  const balancer = protocol[27];
  const debtManager = protocol[28];
  const previewer = protocol[30];
  const installmentsRouter = protocol[31];

  if (initialize) {
    shell.env.PROTOCOL_AUDITOR_ADDRESS = auditor.contractAddress;
    shell.env.PROTOCOL_EXA_ADDRESS = exa.contractAddress;
    shell.env.PROTOCOL_MARKETEXA_ADDRESS = marketEXA.contractAddress; // cspell:disable-line
    shell.env.PROTOCOL_USDC_ADDRESS = usdc.contractAddress;
    shell.env.PROTOCOL_MARKETUSDC_ADDRESS = marketUSDC.contractAddress; // cspell:disable-line
    shell.env.PROTOCOL_WETH_ADDRESS = weth.contractAddress;
    shell.env.PROTOCOL_MARKETWETH_ADDRESS = marketWETH.contractAddress; // cspell:disable-line
    shell.env.PROTOCOL_BALANCERVAULT_ADDRESS = balancer.contractAddress; // cspell:disable-line
    shell.env.PROTOCOL_DEBTMANAGER_ADDRESS = debtManager.contractAddress; // cspell:disable-line
    shell.env.PROTOCOL_PREVIEWER_ADDRESS = previewer.contractAddress;
    shell.env.PROTOCOL_INSTALLMENTSROUTER_ADDRESS = installmentsRouter.contractAddress; // cspell:disable-line
    await $(shell)`forge script test/mocks/Mocks.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script script/IssuerChecker.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [, swapper] = parse(
    object({
      transactions: tuple([
        object({ contractName: literal("MockVelodromeFactory"), contractAddress: Address }),
        object({ contractName: literal("MockSwapper"), contractAddress: Address }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Mocks.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;
  const [issuerChecker] = parse(
    object({
      transactions: tuple([object({ contractName: literal("IssuerChecker"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/IssuerChecker.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    shell.env.SWAPPER_ADDRESS = swapper.contractAddress;
    shell.env.PROTOCOL_ESEXA_ADDRESS = padHex("0x666", { size: 20 }); // cspell:disable-line
    shell.env.PROTOCOL_REWARDSCONTROLLER_ADDRESS = padHex("0x666", { size: 20 }); // cspell:disable-line
    await $(shell)`forge script script/ProposalManager.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script script/Refunder.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script script/ExaPreviewer.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [proposalManager] = parse(
    object({
      transactions: tuple([object({ contractName: literal("ProposalManager"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/ProposalManager.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;
  const [refunder] = parse(
    object({
      transactions: tuple([object({ contractName: literal("Refunder"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/Refunder.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;
  const [exaPreviewer] = parse(
    object({
      transactions: tuple([object({ contractName: literal("ExaPreviewer"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/ExaPreviewer.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    await $(shell)`forge script script/Deploy.s.sol --code-size-limit 69000
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [exaPlugin, , exaAccountFactory] = parse(
    object({
      transactions: tuple([
        object({ contractName: literal("ExaPlugin"), contractAddress: Address }),
        object({ transactionType: literal("CALL"), function: literal("deploy(bytes32,bytes)") }),
        object({ contractName: literal("ExaAccountFactory"), contractAddress: Address }),
      ]),
    }),
    await import(`@exactly/plugin/broadcast/Deploy.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    const bob = privateKeyToAddress(padHex("0xb0b"));
    await Promise.all([
      anvilClient.impersonateAccount({ address: bob }),
      anvilClient.impersonateAccount({ address: keeper.address }),
    ]);
    await $(shell)`forge script test/mocks/Bob.s.sol
      --unlocked ${bob},${keeper.address} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await Promise.all([
      anvilClient.stopImpersonatingAccount({ address: bob }),
      anvilClient.mine({ blocks: 1, interval: 10 * 60 }),
    ]);
    await $(shell)`forge script test/mocks/BobExecute.s.sol
      --unlocked ${keeper.address} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await anvilClient.stopImpersonatingAccount({ address: keeper.address });

    const files = await readdir(__dirname, { recursive: true }); // eslint-disable-line unicorn/prefer-module
    for (const testFile of files.filter((file) => file.endsWith(".test.ts"))) {
      const address = privateKeyToAddress(keccak256(toBytes(testFile)));
      await Promise.all([
        anvilClient.setBalance({ address, value: 10n ** 24n }),
        anvilClient.writeContract({
          address: exaPlugin.contractAddress,
          functionName: "grantRole",
          args: [keccak256(toHex("KEEPER_ROLE")), address],
          abi: exaPluginAbi,
          account: null,
        }),
      ]);
    }
  }

  provide("Auditor", auditor.contractAddress);
  provide("BalancerVault", balancer.contractAddress);
  provide("ExaPreviewer", exaPreviewer.contractAddress);
  provide("EXA", exa.contractAddress);
  provide("ExaAccountFactory", exaAccountFactory.contractAddress);
  provide("ExaPlugin", exaPlugin.contractAddress);
  provide("InstallmentsRouter", installmentsRouter.contractAddress);
  provide("IssuerChecker", issuerChecker.contractAddress);
  provide("MarketEXA", marketEXA.contractAddress);
  provide("MarketUSDC", marketUSDC.contractAddress);
  provide("MarketWETH", marketWETH.contractAddress);
  provide("Previewer", previewer.contractAddress);
  provide("ProposalManager", proposalManager.contractAddress);
  provide("Refunder", refunder.contractAddress);
  provide("Swapper", swapper.contractAddress);
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
    object({ transactionType: literal("CREATE"), contractName: literal("MockERC20"), contractAddress: Address }),
    object({ transactionType: literal("CREATE"), contractName: literal("Market") }),
    object({ transactionType: literal("CREATE"), contractName: literal("ERC1967Proxy"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("InterestRateModel") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockPriceFeed") }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("MockERC20"), contractAddress: Address }),
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
    object({
      transactionType: literal("CREATE"),
      contractName: literal("MockBalancerVault"),
      contractAddress: Address,
    }),
    object({ transactionType: literal("CREATE"), contractName: literal("DebtManager"), contractAddress: Address }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CREATE"), contractName: literal("Previewer"), contractAddress: Address }),
    object({
      transactionType: literal("CREATE"),
      contractName: literal("InstallmentsRouter"),
      contractAddress: Address,
    }),
  ]),
});

declare module "vitest" {
  export interface ProvidedContext {
    Auditor: Address;
    BalancerVault: Address;
    ExaPreviewer: Address;
    EXA: Address;
    ExaAccountFactory: Address;
    ExaPlugin: Address;
    InstallmentsRouter: Address;
    IssuerChecker: Address;
    MarketEXA: Address;
    MarketUSDC: Address;
    MarketWETH: Address;
    ProposalManager: Address;
    Previewer: Address;
    Refunder: Address;
    Swapper: Address;
    USDC: Address;
    WETH: Address;
  }
}
