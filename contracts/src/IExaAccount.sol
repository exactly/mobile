// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

interface IExaAccount {
  function propose(IMarket market, uint256 amount, address receiver) external;
  function repay(uint256 maturity) external;
  function crossRepay(uint256 maturity, IMarket collateral) external;

  function collectCredit(uint256 maturity, uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function poke(IMarket market) external;
  function withdraw() external;
}

event Proposed(
  address indexed account, IMarket indexed market, address indexed receiver, uint256 amount, uint256 unlock
);

struct FixedPool {
  uint256 borrowed;
  uint256 supplied;
  uint256 unassignedEarnings;
  uint256 lastAccrual;
}

struct FixedPosition {
  uint256 principal;
  uint256 fee;
}

struct MarketData {
  uint128 adjustFactor;
  uint8 decimals;
  uint8 index;
  bool isListed;
  IPriceFeed priceFeed;
}

struct Proposal {
  uint256 amount;
  IMarket market;
  address receiver;
  uint256 timestamp;
}

error BorrowLimitExceeded();
error Expired();
error InsufficientLiquidity();
error NoBalance();
error NoProposal();
error NotMarket();
error Timelocked();
error Unauthorized();

interface IAuditor {
  function accountMarkets(address account) external view returns (uint256);
  function allMarkets() external view returns (IMarket[] memory);
  function assetPrice(IPriceFeed priceFeed) external view returns (uint256);
  function enterMarket(IMarket market) external;
  function marketList(uint256 index) external view returns (IMarket);
  function markets(IMarket market) external view returns (MarketData memory);

  struct AccountLiquidity {
    uint256 balance;
    uint256 borrowBalance;
    uint256 price;
  }
}

interface IMarket is IERC4626 {
  function accountSnapshot(address account) external view returns (uint256, uint256);
  function backupFeeRate() external view returns (uint256);
  function borrow(uint256 assets, address receiver, address borrower) external returns (uint256 borrowShares);
  function borrowAtMaturity(uint256 maturity, uint256 assets, uint256 maxAssets, address receiver, address borrower)
    external
    returns (uint256 assetsOwed);
  function fixedBorrowPositions(uint256 maturity, address borrower) external view returns (FixedPosition memory);
  function fixedPools(uint256 maturity) external view returns (FixedPool memory);
  function penaltyRate() external view returns (uint256);
  function repayAtMaturity(uint256 maturity, uint256 positionAssets, uint256 maxAssets, address borrower)
    external
    returns (uint256 actualRepayAssets);
  function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
}

interface IPriceFeed {
  function decimals() external view returns (uint8);
  function latestAnswer() external view returns (int256);
}
