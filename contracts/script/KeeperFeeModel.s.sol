// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { KeeperFeeModel } from "../src/KeeperFeeModel.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployKeeperFeeModel is BaseScript {
  using stdJson for string;

  KeeperFeeModel public keeperFeeModel;

  function run() external {
    string memory deploy = vm.readFile("deploy.json");

    vm.broadcast(acct("deployer"));
    keeperFeeModel = new KeeperFeeModel(
      abi.decode(deploy.parseRaw(".keeperFeeModel.durationStart"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.durationEnd"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.durationGrowth"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.feeStart"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.feeEnd"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.minFee"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperFeeModel.linearRatio"), (uint256))
    );
  }
}
