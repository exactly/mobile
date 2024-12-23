// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { IssuerChecker, IssuerSet, ZeroAddress } from "../src/IssuerChecker.sol";
import { ForkTest } from "./Fork.t.sol";
import { IAccessControl } from "openzeppelin-contracts/contracts/access/IAccessControl.sol";

contract IssuerCheckerTest is ForkTest {
  IssuerChecker internal issuerChecker;

  function setUp() external {
    issuerChecker = new IssuerChecker(address(this), address(this));
  }

  // solhint-disable func-name-mixedcase

  function test_setIssuer_emits_IssuerSet() external {
    address newIssuer = address(0x123);
    vm.expectEmit(true, true, true, true, address(issuerChecker));
    emit IssuerSet(newIssuer, address(this));
    issuerChecker.setIssuer(newIssuer);

    assertEq(issuerChecker.issuer(), newIssuer);
  }

  function test_setIssuer_reverts_whenZeroAddress() external {
    vm.expectRevert(ZeroAddress.selector);
    issuerChecker.setIssuer(address(0));

    assertEq(issuerChecker.issuer(), address(this));
  }

  function test_setIssuer_reverts_whenNotAdmin() external {
    address notAdmin = address(0x123);
    vm.startPrank(notAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, notAdmin, issuerChecker.DEFAULT_ADMIN_ROLE()
      )
    );
    issuerChecker.setIssuer(notAdmin);

    assertEq(issuerChecker.issuer(), address(this));
  }

  // solhint-enable func-name-mixedcase
}
