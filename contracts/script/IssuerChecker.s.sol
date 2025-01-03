// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployIssuerChecker is BaseScript {
  IssuerChecker public issuerChecker;

  function run() external {
    vm.broadcast(acct("deployer"));
    issuerChecker = new IssuerChecker(acct("issuer"));
  }
}
