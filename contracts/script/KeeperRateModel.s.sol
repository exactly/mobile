// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { KeeperRateModel } from "../src/KeeperRateModel.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployKeeperRateModel is BaseScript {
  using stdJson for string;

  KeeperRateModel public keeperRateModel;

  function run() external {
    string memory deploy = vm.readFile("deploy.json");

    vm.broadcast(acct("deployer"));
    keeperRateModel = new KeeperRateModel(
      abi.decode(deploy.parseRaw(".keeperRateModel.durationStart"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.durationEnd"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.durationGrowth"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.rateStart"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.rateEnd"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.minRate"), (uint256)),
      abi.decode(deploy.parseRaw(".keeperRateModel.linearRatio"), (uint256))
    );
  }
}
