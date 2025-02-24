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
  IProposalManager,
  Parameters
} from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployScript is BaseScript {
  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;

  function run() external {
    vm.startBroadcast(acct("deployer"));

    exaPlugin = new ExaPlugin(
      Parameters({
        owner: acct("admin"),
        auditor: IAuditor(protocol("Auditor")),
        exaUSDC: IMarket(protocol("MarketUSDC")),
        exaWETH: IMarket(protocol("MarketWETH")),
        balancerVault: IBalancerVault(protocol("BalancerVault")),
        debtManager: IDebtManager(protocol("DebtManager")),
        installmentsRouter: IInstallmentsRouter(protocol("InstallmentsRouter")),
        issuerChecker: IssuerChecker(broadcast("IssuerChecker")),
        proposalManager: IProposalManager(broadcast("ProposalManager")),
        collector: acct("collector"),
        swapper: acct("swapper"),
        firstKeeper: acct("keeper")
      })
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
