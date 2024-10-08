// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { LibString } from "solady/utils/LibString.sol";

import { IMarket, IssuerChecker, Refunder } from "../src/Refunder.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployRefunder is BaseScript {
  using LibString for uint256;
  using stdJson for string;

  IMarket public exaUSDC;
  IssuerChecker public issuerChecker;
  Refunder public refunder;

  function setUp() external {
    exaUSDC = IMarket(protocol("MarketUSDC"));
    issuerChecker = IssuerChecker(vm.envOr("ISSUER_CHECKER_ADDRESS", address(0)));
    if (address(issuerChecker) == address(0)) {
      issuerChecker = IssuerChecker(
        vm.readFile(string.concat("broadcast/IssuerChecker.s.sol/", block.chainid.toString(), "/run-latest.json"))
          .readAddress(".transactions[0].contractAddress")
      );
    }
  }

  function run() external {
    assert(msg.sender != DEFAULT_SENDER);

    vm.broadcast(msg.sender);
    refunder = new Refunder(exaUSDC, issuerChecker);
  }
}
