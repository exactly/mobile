// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { PluginMetadata, WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import {
  ExaPlugin,
  IAuditor,
  IDebtManager,
  IFlashLoaner,
  IInstallmentsRouter,
  IMarket,
  Parameters
} from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { ProposalManager } from "../src/ProposalManager.sol";
import { BaseScript } from "./Base.s.sol";

contract DeployScript is BaseScript {
  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;

  function run() external {
    address admin = acct("admin");
    address deployer = acct("deployer");
    ProposalManager proposalManager = ProposalManager(broadcast("ProposalManager"));

    vm.startBroadcast(deployer);

    exaPlugin = new ExaPlugin(
      Parameters({
        owner: acct("admin"),
        auditor: IAuditor(protocol("Auditor")),
        exaUSDC: IMarket(protocol("MarketUSDC")),
        exaWETH: IMarket(protocol("MarketWETH")),
        flashLoaner: IFlashLoaner(protocol("BalancerVault")),
        debtManager: IDebtManager(protocol("DebtManager")),
        installmentsRouter: IInstallmentsRouter(protocol("InstallmentsRouter")),
        issuerChecker: IssuerChecker(broadcast("IssuerChecker")),
        proposalManager: proposalManager,
        collector: acct("collector"),
        swapper: acct("swapper"),
        firstKeeper: acct("keeper")
      })
    );
    PluginMetadata memory metadata = exaPlugin.pluginMetadata();
    factory = ExaAccountFactory(
      payable(
        CREATE3_FACTORY.deploy(
          keccak256(abi.encode(metadata.name, metadata.version)),
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

    if (deployer == admin) proposalManager.grantRole(keccak256("PROPOSER_ROLE"), address(exaPlugin));

    vm.stopBroadcast();
  }
}
