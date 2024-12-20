import { exaPluginAbi } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { $ } from "execa";
import { anvil } from "prool/instances";
import { literal, null_, object, parse, tuple } from "valibot";
import { createWalletClient, http, padHex, zeroAddress, zeroHash } from "viem";
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts";
import { foundry } from "viem/chains";
import type { GlobalSetupContext } from "vitest/node";

import anvilClient from "./anvilClient";
import deriveAddress from "../utils/deriveAddress";

export default async function setup({ provide }: GlobalSetupContext) {
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
      COLLECTOR_ADDRESS: privateKeyToAddress(padHex("0x666")),
      ISSUER_ADDRESS: privateKeyToAddress(padHex("0x420")),
      KEEPER_ADDRESS: keeper.address,
      DEPLOYER_ADDRESS: deployer,
    } as Record<string, string>,
  };

  if (initialize) {
    await $(shell)`forge script test/mocks/Account.s.sol --code-size-limit 69000
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script node_modules/webauthn-owner-plugin/script/Plugin.s.sol
      --sender ${deployer} --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
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
  const previewer = protocol[27];
  const installmentsRouter = protocol[28];
  const balancer = protocol[29];
  const velodromeFactory = protocol[32];

  if (initialize) {
    shell.env.PROTOCOL_AUDITOR_ADDRESS = auditor.contractAddress;
    shell.env.PROTOCOL_EXA_ADDRESS = exa.contractAddress;
    shell.env.PROTOCOL_MARKETEXA_ADDRESS = marketEXA.contractAddress;
    shell.env.PROTOCOL_USDC_ADDRESS = usdc.contractAddress;
    shell.env.PROTOCOL_MARKETUSDC_ADDRESS = marketUSDC.contractAddress;
    shell.env.PROTOCOL_WETH_ADDRESS = weth.contractAddress;
    shell.env.PROTOCOL_MARKETWETH_ADDRESS = marketWETH.contractAddress;
    shell.env.PROTOCOL_PREVIEWER_ADDRESS = previewer.contractAddress;
    shell.env.PROTOCOL_INSTALLMENTSROUTER_ADDRESS = installmentsRouter.contractAddress;
    shell.env.PROTOCOL_BALANCERVAULT_ADDRESS = balancer.contractAddress;
    shell.env.PROTOCOL_VELODROMEPOOLFACTORY_ADDRESS = velodromeFactory.contractAddress;
    await $(shell)`forge script script/InstallmentsPreviewer.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
    await $(shell)`forge script script/IssuerChecker.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [issuerChecker] = parse(
    object({
      transactions: tuple([object({ contractName: literal("IssuerChecker"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/IssuerChecker.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    shell.env.BROADCAST_ISSUERCHECKER_ADDRESS = issuerChecker.contractAddress;
    await $(shell)`forge script script/Refunder.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [installmentsPreviewer] = parse(
    object({
      transactions: tuple([object({ contractName: literal("InstallmentsPreviewer"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/InstallmentsPreviewer.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;
  const [refunder] = parse(
    object({
      transactions: tuple([object({ contractName: literal("Refunder"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/Refunder.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    shell.env.BROADCAST_REFUNDER_ADDRESS = refunder.contractAddress;
    await $(shell)`forge script script/KeeperFeeModel.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
  }

  const [keeperFeeModel] = parse(
    object({
      transactions: tuple([object({ contractName: literal("KeeperFeeModel"), contractAddress: Address })]),
    }),
    await import(`@exactly/plugin/broadcast/KeeperFeeModel.s.sol/${foundry.id}/run-latest.json`),
  ).transactions;

  if (initialize) {
    shell.env.BROADCAST_KEEPERFEEMODEL_ADDRESS = keeperFeeModel.contractAddress;
    await $(shell)`forge script script/Deploy.s.sol
      --unlocked ${deployer} --rpc-url ${foundry.rpcUrls.default.http[0]} --broadcast --slow --skip-simulation`;
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
      anvilClient.stopImpersonatingAccount({ address: keeper.address }),
    ]);
    await anvilClient.increaseTime({ seconds: 10 * 60 });
    const bobAccount = deriveAddress(exaAccountFactory.contractAddress, { x: padHex(bob), y: zeroHash });
    const keeperClient = createWalletClient({ chain: foundry, account: keeper, transport: http() });
    await keeperClient.writeContract({ address: bobAccount, functionName: "withdraw", abi: exaPluginAbi });
  }

  provide("Auditor", auditor.contractAddress);
  provide("InstallmentsPreviewer", installmentsPreviewer.contractAddress);
  provide("EXA", exa.contractAddress);
  provide("ExaAccountFactory", exaAccountFactory.contractAddress);
  provide("ExaPlugin", exaPlugin.contractAddress);
  provide("InstallmentsRouter", installmentsRouter.contractAddress);
  provide("IssuerChecker", issuerChecker.contractAddress);
  provide("KeeperFeeModel", keeperFeeModel.contractAddress);
  provide("MarketEXA", marketEXA.contractAddress);
  provide("MarketUSDC", marketUSDC.contractAddress);
  provide("MarketWETH", marketWETH.contractAddress);
  provide("Previewer", previewer.contractAddress);
  provide("Refunder", refunder.contractAddress);
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
      contractName: literal("InstallmentsRouter"),
      contractAddress: Address,
    }),
    object({
      transactionType: literal("CREATE"),
      contractName: literal("MockBalancerVault"),
      contractAddress: Address,
    }),
    object({ transactionType: literal("CALL") }),
    object({ transactionType: literal("CALL") }),
    object({
      transactionType: literal("CREATE"),
      contractName: literal("MockVelodromeFactory"),
      contractAddress: Address,
    }),
  ]),
});

declare module "vitest" {
  export interface ProvidedContext {
    Auditor: Address;
    InstallmentsPreviewer: Address;
    EXA: Address;
    ExaAccountFactory: Address;
    ExaPlugin: Address;
    InstallmentsRouter: Address;
    IssuerChecker: Address;
    KeeperFeeModel: Address;
    MarketEXA: Address;
    MarketUSDC: Address;
    MarketWETH: Address;
    Previewer: Address;
    Refunder: Address;
    USDC: Address;
    WETH: Address;
  }
}
