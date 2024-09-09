// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";

import { LibString } from "solady/utils/LibString.sol";

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";

import { BaseScript } from "../../script/Base.s.sol";

contract DeployAccount is BaseScript {
  using LibString for address;
  using LibString for bytes;

  EntryPoint public entrypoint;
  UpgradeableModularAccount public implementation;

  function run() external {
    vm.startBroadcast();
    vm.etch(address(ENTRYPOINT), address(new EntryPoint()).code);
    vm.etch(ACCOUNT_IMPL, address(new UpgradeableModularAccount(ENTRYPOINT)).code);
    vm.stopBroadcast();
  }
}
