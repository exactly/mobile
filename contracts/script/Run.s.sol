// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ExaPlugin } from "../src/ExaPlugin.sol";

import { BaseScript } from "./Base.s.sol";

contract RunScript is BaseScript {
  function run() external {
    ExaPlugin plugin = ExaPlugin(payable(address(0)));
    vm.etch(address(plugin), vm.getDeployedCode("ExaPlugin.sol:ExaPlugin"));
    emit log(plugin.VERSION());
  }
}
