// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ICollectableMarket, InstallmentsPreviewer } from "../src/InstallmentsPreviewer.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployInstallmentsPreviewer is BaseScript {
  InstallmentsPreviewer public installmentsPreviewer;

  function run() external {
    vm.broadcast(acct("deployer"));
    installmentsPreviewer = new InstallmentsPreviewer(ICollectableMarket(protocol("MarketUSDC")));
  }
}
