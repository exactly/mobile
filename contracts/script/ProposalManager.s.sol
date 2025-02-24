// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";

import { IAuditor, IDebtManager, IInstallmentsRouter, IMarket } from "../src/ExaPlugin.sol";
import { ProposalManager } from "../src/ProposalManager.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployProposalManager is BaseScript {
  ProposalManager public proposalManager;

  function run() external {
    IAuditor auditor = IAuditor(protocol("Auditor"));
    IMarket[] memory markets = auditor.allMarkets();
    address[] memory targets = new address[](markets.length);
    for (uint256 i = 0; i < markets.length; ++i) {
      targets[i] = markets[i].asset();
    }

    vm.broadcast(acct("deployer"));
    proposalManager = new ProposalManager(
      acct("admin"),
      auditor,
      IDebtManager(protocol("DebtManager")),
      IInstallmentsRouter(protocol("InstallmentsRouter")),
      acct("swapper"),
      acct("collector"),
      targets,
      1 minutes
    );
  }
}
