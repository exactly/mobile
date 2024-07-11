// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { Test } from "forge-std/Test.sol";

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";
import { IEntryPoint } from "modular-account/src/interfaces/erc4337/IEntryPoint.sol";

import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import { MAX_OWNERS } from "webauthn-owner-plugin/IWebauthnOwnerPlugin.sol";
import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin } from "../src/ExaPlugin.sol";
import { IAuditor } from "../src/IExaAccount.sol";

// solhint-disable func-name-mixedcase
contract ExaAccountFactoryTest is Test {
  using FixedPointMathLib for uint256;
  using OwnersLib for address[];

  ExaAccountFactory internal factory;
  WebauthnOwnerPlugin internal ownerPlugin;
  ExaPlugin internal exaPlugin;

  function setUp() external {
    ownerPlugin = new WebauthnOwnerPlugin();
    exaPlugin = new ExaPlugin(IAuditor(address(0)), address(this));

    IEntryPoint entryPoint = IEntryPoint(address(new EntryPoint()));
    factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(entryPoint)), entryPoint
    );
  }

  function testFuzz_createAccount_EOAOwners(uint256 salt, address[MAX_OWNERS - 1] calldata rawOwners) external {
    // bound length
    address[] memory owners = new address[](_bound(salt, 1, rawOwners.length));
    for (uint256 i = 0; i < owners.length; ++i) {
      vm.assume(rawOwners[i] != address(0) && rawOwners[i] != address(factory));
      owners[i] = rawOwners[i];
    }

    // sort
    for (uint256 i = 0; i < owners.length; ++i) {
      uint256 j = i;
      while (j > 0 && owners[j - 1] > owners[j]) {
        (owners[j - 1], owners[j]) = (owners[j], owners[j - 1]);
        --j;
      }
    }

    for (uint256 i = 0; i < owners.length - 1; ++i) {
      vm.assume(owners[i] != owners[i + 1]); // unique
    }

    address account = factory.createAccount(salt, owners.toPublicKeys());

    address[] memory actualOwners = ownerPlugin.ownersOf(account);
    assertEq(actualOwners.length, owners.length);
    assertFalse(ownerPlugin.isOwnerOf(account, address(factory)));
    for (uint256 i = 0; i < owners.length; ++i) {
      ownerPlugin.isOwnerOf(account, owners[i]);
    }
  }

  function _sorted(address[] memory owners) internal pure returns (address[] memory) {
    return owners;
  }
}
