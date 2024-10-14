// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { KeeperFeeModel } from "../src/KeeperFeeModel.sol";

import { BaseScript } from "./Base.s.sol";

contract DeployKeeperFeeModel is BaseScript {
  KeeperFeeModel public keeperFeeModel;

  function run() external {
    assert(msg.sender != DEFAULT_SENDER);

    vm.broadcast(msg.sender);
    keeperFeeModel = new KeeperFeeModel(
      vm.envUint("KFM_DURATION_START"),
      vm.envUint("KFM_DURATION_END"),
      vm.envUint("KFM_DURATION_GROWTH"),
      vm.envUint("KFM_FEE_START"),
      vm.envUint("KFM_FEE_END"),
      vm.envUint("KFM_MIN_FEE"),
      vm.envUint("KFM_LINEAR_RATIO")
    );
  }
}
