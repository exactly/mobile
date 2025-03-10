// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { ZeroAddress } from "../src/IExaAccount.sol";
import {
  InvalidOperationExpiry,
  IssuerChecker,
  IssuerSet,
  OperationExpirySet,
  PrevIssuerWindowSet
} from "../src/IssuerChecker.sol";
import { ForkTest } from "./Fork.t.sol";
import { IAccessControl } from "openzeppelin-contracts/contracts/access/IAccessControl.sol";

contract IssuerCheckerTest is ForkTest {
  IssuerChecker internal issuerChecker;
  uint256 internal operationExpiry = 10 minutes;
  uint256 internal prevIssuerWindow = 10 days;

  function setUp() external {
    issuerChecker = new IssuerChecker(address(this), address(this), operationExpiry, prevIssuerWindow);
  }

  // solhint-disable func-name-mixedcase

  function test_setIssuer_emits_IssuerSet() external {
    address prevIssuer = issuerChecker.issuer();
    address newIssuer = address(0x123);
    vm.expectEmit(true, true, true, true, address(issuerChecker));
    emit IssuerSet(newIssuer, address(this));
    issuerChecker.setIssuer(newIssuer);

    assertEq(issuerChecker.issuer(), newIssuer);
    assertEq(issuerChecker.prevIssuer(), prevIssuer);
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

  function test_setOperationExpiry_emits_OperationExpirySet() external {
    assertEq(issuerChecker.operationExpiry(), operationExpiry);
    uint256 newOperationExpiry = 20 minutes;
    vm.expectEmit(true, true, true, true, address(issuerChecker));
    emit OperationExpirySet(address(this), newOperationExpiry);
    issuerChecker.setOperationExpiry(newOperationExpiry);

    assertEq(issuerChecker.operationExpiry(), newOperationExpiry);
  }

  function test_setOperationExpiry_reverts_whenZeroValue() external {
    vm.expectRevert(InvalidOperationExpiry.selector);
    issuerChecker.setOperationExpiry(0);

    assertEq(issuerChecker.operationExpiry(), operationExpiry);
  }

  function test_setOperationExpiry_reverts_whenNotAdmin() external {
    address notAdmin = address(0x123);
    vm.startPrank(notAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, notAdmin, issuerChecker.DEFAULT_ADMIN_ROLE()
      )
    );
    issuerChecker.setOperationExpiry(20 minutes);

    assertEq(issuerChecker.operationExpiry(), operationExpiry);
  }

  function test_setPrevIssuerWindow_emits_PrevIssuerWindowSet() external {
    assertEq(issuerChecker.prevIssuerWindow(), prevIssuerWindow);
    uint256 newPrevIssuerWindow = 20 days;
    vm.expectEmit(true, true, true, true, address(issuerChecker));
    emit PrevIssuerWindowSet(address(this), newPrevIssuerWindow);
    issuerChecker.setPrevIssuerWindow(newPrevIssuerWindow);

    assertEq(issuerChecker.prevIssuerWindow(), newPrevIssuerWindow);
  }

  function test_setPrevIssuerWindow_reverts_whenNotAdmin() external {
    address notAdmin = address(0x123);
    vm.startPrank(notAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, notAdmin, issuerChecker.DEFAULT_ADMIN_ROLE()
      )
    );
    issuerChecker.setPrevIssuerWindow(20 days);

    assertEq(issuerChecker.prevIssuerWindow(), prevIssuerWindow);
  }

  // solhint-enable func-name-mixedcase
}
