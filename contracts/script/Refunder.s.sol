// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IMarket, IssuerChecker, Refunder } from "../src/Refunder.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployRefunder is BaseScript {
  IMarket public exaUSDC;
  IssuerChecker public issuerChecker;
  Refunder public refunder;

  address public keeper;
  address public deployer;

  function setUp() external {
    exaUSDC = IMarket(protocol("MarketUSDC"));
    issuerChecker = IssuerChecker(broadcast("IssuerChecker"));

    keeper = acct("keeper");
    deployer = acct("deployer");
  }

  function run() external {
    vm.startBroadcast(deployer);

    refunder = new Refunder(exaUSDC, issuerChecker);

    refunder.grantRole(refunder.KEEPER_ROLE(), keeper);

    vm.stopBroadcast();
  }
}
