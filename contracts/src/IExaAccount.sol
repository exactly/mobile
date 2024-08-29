// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

interface IExaAccount {
  function propose(IMarket market, uint256 amount, address receiver) external;
  function repay(uint256 maturity) external;

  function collectCredit(uint256 maturity, uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function poke(IMarket market) external;
  function withdraw() external;
}

event Proposed(address indexed account, IMarket indexed market, address indexed receiver, uint256 amount);

struct FixedPosition {
  uint256 principal;
  uint256 fee;
}

struct Proposal {
  uint256 amount;
  IMarket market;
  address receiver;
  uint256 timestamp;
}

error BorrowLimitExceeded();
error Expired();
error NoProposal();
error NotMarket();
error Timelocked();
error Unauthorized();
error ZeroAmount();

interface IAuditor {
  function markets(IMarket market)
    external
    view
    returns (uint128 adjustFactor, uint8 decimals, uint8 index, bool isListed, IPriceFeed priceFeed);
  function enterMarket(IMarket market) external;
}

interface IMarket is IERC4626 {
  function borrow(uint256 assets, address receiver, address borrower) external returns (uint256 borrowShares);
  function borrowAtMaturity(uint256 maturity, uint256 assets, uint256 maxAssets, address receiver, address borrower)
    external
    returns (uint256 assetsOwed);
  function fixedBorrowPositions(uint256 maturity, address borrower) external view returns (FixedPosition memory);
  function repayAtMaturity(uint256 maturity, uint256 positionAssets, uint256 maxAssets, address borrower)
    external
    returns (uint256 actualRepayAssets);
}

interface IPriceFeed {
  function latestAnswer() external view returns (int256);
}
