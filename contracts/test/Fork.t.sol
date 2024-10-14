// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { Test, stdError, stdJson } from "forge-std/Test.sol"; // solhint-disable-line no-unused-import
import { Vm } from "forge-std/Vm.sol"; // solhint-disable-line no-unused-import

import { LibString } from "solady/utils/LibString.sol";

abstract contract ForkTest is Test {
  using LibString for uint256;
  using LibString for string;
  using stdJson for string;

  function acct(string memory name) internal returns (address addr) {
    addr = vm.envOr(string.concat(name.upper(), "_ADDRESS"), address(0));
    if (addr == address(0)) {
      string memory deploy = vm.readFile("deploy.json");
      string memory key = string.concat(".accounts.", name, ".", block.chainid.toString());
      addr = deploy.keyExists(key)
        ? deploy.readAddress(key)
        : deploy.readAddress(string.concat(".accounts.", name, ".default"));
    }
    _label(addr, name);
  }

  function protocol(string memory name) internal returns (address addr) {
    addr = vm.envOr(string.concat("PROTOCOL_", name.upper(), "_ADDRESS"), address(0));
    if (addr == address(0)) {
      addr = vm.readFile(
        string.concat(
          "../node_modules/@exactly/protocol/deployments/",
          block.chainid == 11_155_420 ? "op-sepolia" : getChain(block.chainid).chainAlias,
          "/",
          name,
          ".json"
        )
      ).readAddress(".address");
    }
    _label(addr, name);
  }

  function broadcast(string memory name) internal returns (address) {
    return broadcast(name, name, 0);
  }

  function broadcast(string memory name, string memory script, uint256 index) internal returns (address) {
    return _broadcast(name, string.concat("broadcast/", script), index);
  }

  function dependency(string memory package, string memory name, string memory script, uint256 index)
    internal
    returns (address)
  {
    return _broadcast(name, string.concat("node_modules/", package, "/broadcast/", script), index);
  }

  function _broadcast(string memory name, string memory script, uint256 index) private returns (address addr) {
    addr = vm.envOr(string.concat("BROADCAST_", name.upper(), "_ADDRESS"), address(0));
    if (addr == address(0)) {
      addr = vm.readFile(string.concat(script, ".s.sol/", block.chainid.toString(), "/run-latest.json")).readAddress(
        string.concat(".transactions[", index.toString(), "].contractAddress")
      );
    }
    _label(addr, name);
  }

  function _label(address addr, string memory name) private {
    vm.label(addr, name);

    address impl =
      address(uint160(uint256(vm.load(addr, bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)))));
    if (impl != address(0)) {
      vm.label(impl, string.concat(name, "_Impl"));
    } else if (bytes10(addr.code) == 0x363d3d373d3d3d363d73) {
      vm.label(address(uint160(uint240(bytes30(addr.code)))), string.concat(name, "_Impl"));
    }
  }
}
