// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { Test, stdError, stdJson } from "forge-std/Test.sol"; // solhint-disable-line no-unused-import
import { Vm } from "forge-std/Vm.sol"; // solhint-disable-line no-unused-import

abstract contract ForkTest is Test {
  using stdJson for string;

  function protocol(string memory name) internal returns (address addr) {
    addr = vm.readFile(string.concat("../node_modules/@exactly/protocol/deployments/", chain(), "/", name, ".json"))
      .readAddress(".address");
    vm.label(addr, name);

    address impl =
      address(uint160(uint256(vm.load(addr, bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)))));
    if (impl != address(0)) {
      vm.label(impl, string.concat(name, "_Impl"));
    } else if (bytes10(addr.code) == 0x363d3d373d3d3d363d73) {
      vm.label(address(uint160(uint240(bytes30(addr.code)))), string.concat(name, "_Impl"));
    }
  }

  function chain() internal returns (string memory) {
    if (block.chainid == 11_155_420) return "op-sepolia";
    return getChain(block.chainid).chainAlias;
  }
}

interface IProxy {
  function implementation() external returns (address);
}
