// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

interface IExaAccount {
  function propose(IMarket market, uint256 amount, address receiver) external;
  function enterMarket(IMarket market) external;
  function approve(IMarket market, uint256 amount) external;
  function deposit(IMarket market, uint256 amount) external;
  function borrow(IMarket market, uint256 amount) external;
  function borrowAtMaturity(IMarket market, uint256 maturity, uint256 amount, uint256 maxAmount) external;
  function withdraw(IMarket market, uint256 amount) external;
}

error BorrowLimitExceeded();
error NotAuthorized();
error NotMarket();
error NoProposal();
error Timelocked();
error WrongAmount();
error WrongMarket();
error WrongReceiver();

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
}

interface IPriceFeed {
  function latestAnswer() external view returns (int256);
}
