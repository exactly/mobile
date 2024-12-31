// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IAuditor, IBalancerVault, IDebtManager, IInstallmentsRouter, IMarket } from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript } from "./Base.s.sol";

// solhint-disable-next-line max-states-count
contract DeployScript is BaseScript {
  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;

  function run() external {
    vm.startBroadcast(acct("deployer"));

    exaPlugin = new ExaPlugin(
      acct("admin"),
      IAuditor(protocol("Auditor")),
      IMarket(protocol("MarketUSDC")),
      IMarket(protocol("MarketWETH")),
      IBalancerVault(protocol("BalancerVault")),
      IDebtManager(protocol("DebtManager")),
      IInstallmentsRouter(protocol("InstallmentsRouter")),
      IssuerChecker(broadcast("IssuerChecker")),
      acct("collector"),
      acct("swapper"),
      acct("keeper")
    );

    factory = new ExaAccountFactory(
      acct("admin"),
      WebauthnOwnerPlugin(dependency("webauthn-owner-plugin", "WebauthnOwnerPlugin", "Plugin", 0)),
      exaPlugin,
      ACCOUNT_IMPL,
      ENTRYPOINT
    );

    factory.donateStake{ value: 0.1 ether }();

    vm.stopBroadcast();
  }
}
