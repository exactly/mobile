// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";

import { IMarket, Unauthorized } from "./IExaAccount.sol";
import { IssuerChecker } from "./IssuerChecker.sol";

/// @title Refunder
/// @author Exactly
contract Refunder is AccessControl {
  IMarket public immutable EXA_USDC;
  IssuerChecker public immutable ISSUER_CHECKER;
  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  constructor(address owner, IMarket exaUSDC, IssuerChecker issuerChecker, address firstKeeper) {
    EXA_USDC = exaUSDC;
    IERC20(EXA_USDC.asset()).approve(address(EXA_USDC), type(uint256).max);
    ISSUER_CHECKER = issuerChecker;
    _grantRole(KEEPER_ROLE, firstKeeper);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);
  }

  function refund(address account, uint256 amount, uint256 timestamp, bytes calldata signature)
    external
    onlyKeeper
    onlyIssuer(account, amount, timestamp, signature)
  {
    EXA_USDC.deposit(amount, account);
  }

  modifier onlyKeeper() {
    if (!hasRole(KEEPER_ROLE, msg.sender)) revert Unauthorized();
    _;
  }

  modifier onlyIssuer(address account, uint256 amount, uint256 timestamp, bytes calldata signature) {
    ISSUER_CHECKER.checkIssuer(account, amount, timestamp, signature);
    _;
  }
}
