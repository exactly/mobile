// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import {
  ExaPlugin,
  IAuditor,
  IBalancerVault,
  IDebtManager,
  IInstallmentsRouter,
  IMarket,
  IProposalManager
} from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript } from "./Base.s.sol";

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
      IProposalManager(address(this)), // FIXME
      acct("collector"),
      acct("swapper"),
      acct("keeper")
    );

    factory = ExaAccountFactory(
      payable(
        CREATE3_FACTORY.deploy(
          keccak256(abi.encode(exaPlugin.NAME(), exaPlugin.VERSION())),
          abi.encodePacked(
            vm.getCode("ExaAccountFactory.sol:ExaAccountFactory"),
            abi.encode(
              acct("admin"),
              WebauthnOwnerPlugin(dependency("webauthn-owner-plugin", "WebauthnOwnerPlugin", "Plugin", 0)),
              exaPlugin,
              ACCOUNT_IMPL,
              ENTRYPOINT
            )
          )
        )
      )
    );

    factory.donateStake{ value: 0.1 ether }();

    vm.stopBroadcast();
  }
}
