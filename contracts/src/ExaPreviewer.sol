// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import { FixedPool, IMarket } from "./IExaAccount.sol";

uint256 constant FIXED_INTERVAL = 4 weeks;

contract ExaPreviewer {
  using FixedPointMathLib for uint256;

  ICollectableMarket public immutable EXA_USDC;

  constructor(ICollectableMarket exaUSDC) {
    EXA_USDC = exaUSDC;
  }

  function utilizations() external view returns (Utilizations memory) {
    uint256 floatingAssets = EXA_USDC.floatingAssets();
    uint256 floatingDebt = EXA_USDC.floatingDebt();
    uint256 backupBorrowed = EXA_USDC.floatingBackupBorrowed();
    FixedUtilization[] memory fixedUtilizations = new FixedUtilization[](EXA_USDC.maxFuturePools());
    for (uint256 i = 0; i < fixedUtilizations.length; ++i) {
      // slither-disable-next-line weak-prng
      uint256 maturity = block.timestamp + (i + 1) * FIXED_INTERVAL - (block.timestamp % FIXED_INTERVAL);
      // slither-disable-next-line calls-loop
      FixedPool memory pool = EXA_USDC.fixedPools(maturity);
      fixedUtilizations[i] = FixedUtilization({
        maturity: maturity,
        utilization: floatingAssets != 0 && pool.borrowed > pool.supplied
          ? (pool.borrowed - pool.supplied).divWadUp(floatingAssets)
          : 0
      });
    }
    return Utilizations({
      floatingAssets: floatingAssets,
      globalUtilization: floatingAssets != 0 ? (floatingDebt + backupBorrowed).divWadUp(floatingAssets) : 0,
      floatingUtilization: floatingAssets != 0 ? floatingDebt.divWadUp(floatingAssets) : 0,
      fixedUtilizations: fixedUtilizations,
      interestRateModel: EXA_USDC.interestRateModel().parameters()
    });
  }
}

interface ICollectableMarket is IMarket {
  function floatingAssets() external view returns (uint256);
  function floatingBackupBorrowed() external view returns (uint256);
  function floatingDebt() external view returns (uint256);
  function interestRateModel() external view returns (IInterestRateModel);
  function maxFuturePools() external view returns (uint256);
}

interface IInterestRateModel {
  function parameters() external view returns (IRMParameters memory);
}

struct Utilizations {
  uint256 floatingAssets;
  uint256 globalUtilization;
  uint256 floatingUtilization;
  FixedUtilization[] fixedUtilizations;
  IRMParameters interestRateModel;
}

struct FixedUtilization {
  uint256 maturity;
  uint256 utilization;
}

struct IRMParameters {
  uint256 minRate;
  uint256 naturalRate;
  uint256 maxUtilization;
  uint256 naturalUtilization;
  uint256 growthSpeed;
  uint256 sigmoidSpeed;
  uint256 spreadFactor;
  uint256 maturitySpeed;
  int256 timePreference;
  uint256 fixedAllocation;
  uint256 maxRate;
}
