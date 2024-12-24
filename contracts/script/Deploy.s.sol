// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IAuditor, IBalancerVault, IDebtManager, IInstallmentsRouter, IMarket } from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { Refunder } from "../src/Refunder.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployScript is BaseScript {
  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;
  IssuerChecker public issuerChecker;
  WebauthnOwnerPlugin public ownerPlugin;
  IAuditor public auditor;
  IMarket public exaUSDC;
  IMarket public exaWETH;
  IDebtManager public debtManager;
  IInstallmentsRouter public installmentsRouter;
  Refunder public refunder;
  IBalancerVault public balancerVault;

  address public keeper;
  address public deployer;
  address public collector;
  address public swapper;

  function setUp() external {
    ownerPlugin = WebauthnOwnerPlugin(dependency("webauthn-owner-plugin", "WebauthnOwnerPlugin", "Plugin", 0));
    issuerChecker = IssuerChecker(broadcast("IssuerChecker"));
    auditor = IAuditor(protocol("Auditor"));
    exaUSDC = IMarket(protocol("MarketUSDC"));
    exaWETH = IMarket(protocol("MarketWETH"));
    debtManager = IDebtManager(protocol("DebtManager"));
    installmentsRouter = IInstallmentsRouter(protocol("InstallmentsRouter"));
    refunder = Refunder(broadcast("Refunder"));

    balancerVault = IBalancerVault(protocol("BalancerVault"));

    keeper = acct("keeper");
    deployer = acct("deployer");
    collector = acct("collector");
    swapper = acct("swapper");
  }

  function run() external {
    vm.startBroadcast(deployer);

    exaPlugin = new ExaPlugin(
      auditor, exaUSDC, exaWETH, balancerVault, debtManager, installmentsRouter, issuerChecker, collector, swapper
    );
    factory = new ExaAccountFactory(deployer, ownerPlugin, exaPlugin, ACCOUNT_IMPL, ENTRYPOINT);

    factory.donateStake{ value: 0.1 ether }();

    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

    vm.stopBroadcast();
  }
}
