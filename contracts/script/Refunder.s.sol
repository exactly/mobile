// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IMarket, IssuerChecker, Refunder } from "../src/Refunder.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployRefunder is BaseScript {
  Refunder public refunder;

  function run() external {
    vm.broadcast(acct("deployer"));
    refunder = new Refunder(
      acct("admin"), IMarket(protocol("MarketUSDC")), IssuerChecker(broadcast("IssuerChecker")), acct("keeper")
    );
  }
}
