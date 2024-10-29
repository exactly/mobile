// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IAuditor, IBalancerVault, IInstallmentsRouter, IMarket } from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { KeeperFeeModel } from "../src/KeeperFeeModel.sol";
import { Refunder } from "../src/Refunder.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployScript is BaseScript {
  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;
  IssuerChecker public issuerChecker;
  KeeperFeeModel public keeperFeeModel;
  WebauthnOwnerPlugin public ownerPlugin;
  IAuditor public auditor;
  IMarket public exaUSDC;
  IMarket public exaWETH;
  IInstallmentsRouter public installmentsRouter;
  Refunder public refunder;
  IBalancerVault public balancerVault;

  address public keeper;
  address public deployer;
  address public collector;

  function setUp() external {
    ownerPlugin = WebauthnOwnerPlugin(dependency("webauthn-owner-plugin", "WebauthnOwnerPlugin", "Plugin", 0));
    issuerChecker = IssuerChecker(broadcast("IssuerChecker"));
    auditor = IAuditor(protocol("Auditor"));
    exaUSDC = IMarket(protocol("MarketUSDC"));
    exaWETH = IMarket(protocol("MarketWETH"));
    installmentsRouter = IInstallmentsRouter(protocol("InstallmentsRouter"));
    refunder = Refunder(broadcast("Refunder"));
    keeperFeeModel = KeeperFeeModel(broadcast("KeeperFeeModel"));

    balancerVault = IBalancerVault(protocol("BalancerVault"));

    keeper = acct("keeper");
    deployer = acct("deployer");
    collector = acct("collector");
  }

  function run() external {
    vm.startBroadcast(deployer);

    exaPlugin = new ExaPlugin(
      auditor, exaUSDC, exaWETH, balancerVault, installmentsRouter, issuerChecker, collector, keeperFeeModel
    );
    factory = new ExaAccountFactory(deployer, ownerPlugin, exaPlugin, ACCOUNT_IMPL, ENTRYPOINT);

    factory.addStake{ value: 0.1 ether }(1 days, 0.1 ether);

    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

    vm.stopBroadcast();
  }
}
