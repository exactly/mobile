// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { Upgrades } from "@openzeppelin/foundry-upgrades/LegacyUpgrades.sol";

import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";

import { IAuditor, IDebtManager, IInstallmentsRouter } from "../src/ExaPlugin.sol";
import { ProposalManager } from "../src/ProposalManager.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployProposalManager is BaseScript {
  ProposalManager public proposalManager;

  function run() external {
    vm.startBroadcast(acct("deployer"));

    address[] memory targets = new address[](3);
    targets[0] = protocol("USDC");
    targets[1] = protocol("WETH");
    targets[2] = protocol("EXA");

    Upgrades.deployTransparentProxy(
      "ProposalManager.sol",
      acct("admin"),
      abi.encodeCall(ProposalManager.initialize, (address(this), acct("collector"), targets, 1 minutes))
    );

    // proposalManager = new ProposalManager(
    //   IAuditor(address(auditor)),
    //   IDebtManager(address(p.debtManager())),
    //   IInstallmentsRouter(address(p.installmentsRouter())),
    //   address(m.swapper())
    // );
    // proposalManager.initialize(address(this), acct("collector"), targets, 1 minutes);

    // proposalManager = new ProposalManager(
    //   acct("admin"),
    //   IAuditor(protocol("Auditor")),
    //   IDebtManager(protocol("DebtManager")),
    //   IInstallmentsRouter(protocol("InstallmentsRouter")),
    //   acct("swapper"),
    //   acct("collector"),
    //   IERC20(protocol("USDC")),
    //   IERC20(protocol("WETH"))
    // );

    vm.stopBroadcast();
  }
}
