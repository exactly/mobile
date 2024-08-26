// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

interface IExaAccount {
  function propose(IMarket market, uint256 amount, address receiver) external;

  function collectCredit(uint256 maturity, uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature) external;
  function poke(IMarket market) external;
  function withdraw(IMarket market, uint256 amount) external;
}

event Proposed(IMarket market, uint256 amount, address receiver, address creator);

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
error WrongAmount();
error WrongMarket();
error WrongReceiver();
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
}

interface IPriceFeed {
  function latestAnswer() external view returns (int256);
}
