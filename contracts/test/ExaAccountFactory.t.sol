// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { Test } from "forge-std/Test.sol";

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";
import { IEntryPoint } from "modular-account/src/interfaces/erc4337/IEntryPoint.sol";

import { ERC20 } from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol";

import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import { MAX_OWNERS } from "webauthn-owner-plugin/IWebauthnOwnerPlugin.sol";
import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory, ExaAccountInitialized } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IBalancerVault, IDebtManager, IInstallmentsRouter } from "../src/ExaPlugin.sol";
import { IAuditor, IMarket } from "../src/IExaAccount.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

contract ExaAccountFactoryTest is Test {
  using FixedPointMathLib for uint256;
  using OwnersLib for address[];

  ExaAccountFactory internal factory;
  WebauthnOwnerPlugin internal ownerPlugin;
  ExaPlugin internal exaPlugin;

  function setUp() external {
    ownerPlugin = new WebauthnOwnerPlugin();
    exaPlugin = new ExaPlugin(
      address(this),
      IAuditor(address(0)),
      IMarket(address(new MockERC4626(new MockERC20()))),
      IMarket(address(new MockERC4626(new MockERC20()))),
      IBalancerVault(address(this)),
      IDebtManager(address(this)),
      IInstallmentsRouter(address(this)),
      IssuerChecker(address(this)),
      address(this),
      address(this),
      address(this)
    );

    IEntryPoint entryPoint = IEntryPoint(address(new EntryPoint()));
    factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(entryPoint)), entryPoint
    );
  }

  // solhint-disable func-name-mixedcase

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

    vm.expectEmit(true, true, true, true, address(factory));
    emit ExaAccountInitialized(factory.getAddress(salt, owners.toPublicKeys()));

    address account = factory.createAccount(salt, owners.toPublicKeys());

    address[] memory actualOwners = ownerPlugin.ownersOf(account);
    assertEq(actualOwners.length, owners.length);
    assertFalse(ownerPlugin.isOwnerOf(account, address(factory)));
    for (uint256 i = 0; i < owners.length; ++i) {
      ownerPlugin.isOwnerOf(account, owners[i]);
    }
  }

  // solhint-enable func-name-mixedcase

  function _sorted(address[] memory owners) internal pure returns (address[] memory) {
    return owners;
  }
}

contract MockERC4626 is ERC4626 {
  constructor(ERC20 token) ERC20("", "") ERC4626(token) { }
}

contract MockERC20 is ERC20 {
  constructor() ERC20("", "") { }
}
