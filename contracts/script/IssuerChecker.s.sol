// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployIssuerChecker is BaseScript {
  using stdJson for string;

  IssuerChecker public issuerChecker;

  function run() external {
    string memory deploy = vm.readFile("deploy.json");
    vm.broadcast(acct("deployer"));
    issuerChecker = new IssuerChecker(
      acct("admin"),
      acct("issuer"),
      abi.decode(deploy.parseRaw(".issuerChecker.operationExpiry"), (uint256)),
      abi.decode(deploy.parseRaw(".issuerChecker.prevIssuerWindow"), (uint256))
    );
  }
}
