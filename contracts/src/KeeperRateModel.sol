// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";

contract KeeperRateModel {
  using FixedPointMathLib for uint256;
  using FixedPointMathLib for int256;
  using SafeCastLib for uint256;
  using SafeCastLib for int256;

  uint256 public immutable DURATION_START;
  uint256 public immutable DURATION_END;
  uint256 public immutable DURATION_GROWTH;
  uint256 public immutable MIN_RATE;
  uint256 public immutable RATE_START;
  uint256 public immutable RATE_END;
  uint256 public immutable LINEAR_RATIO;

  constructor(
    uint256 _durationStart,
    uint256 _durationEnd,
    uint256 _durationGrowth,
    uint256 _rateStart,
    uint256 _rateEnd,
    uint256 _minRate,
    uint256 _linearRatio
  ) {
    if (_durationStart >= _durationEnd || _durationGrowth > 10e18 || _rateStart >= _rateEnd || _linearRatio > 1e18) {
      revert InvalidRange();
    }
    DURATION_START = _durationStart;
    DURATION_END = _durationEnd;
    DURATION_GROWTH = _durationGrowth;
    RATE_START = _rateStart;
    RATE_END = _rateEnd;
    MIN_RATE = _minRate;
    LINEAR_RATIO = _linearRatio;
  }

  function rate(uint256[] memory amounts, uint256 firstMaturity) external view returns (uint256) {
    uint256 amountsByTime = 0;
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < amounts.length; ++i) {
      // TODO use FixedLib.INTERVAL
      amountsByTime += amounts[i] * (firstMaturity + 4 weeks * i - block.timestamp);
      totalAmount += amounts[i];
    }
    uint256 avgDuration = amountsByTime.divWad(totalAmount);

    uint256 linearRate =
      RATE_START + (RATE_END - RATE_START).mulDiv(avgDuration - DURATION_START, DURATION_END - DURATION_START);
    uint256 nonLinearRate = RATE_START
      + (RATE_END - RATE_START).mulWad(
        (
          (avgDuration - DURATION_START).divWad(DURATION_END - DURATION_START).toInt256().powWad(
            DURATION_GROWTH.toInt256()
          ).toUint256()
        )
      );

    return MIN_RATE + linearRate.mulWad(LINEAR_RATIO) + nonLinearRate.mulWad(1e18 - LINEAR_RATIO);
  }
}

error InvalidRange();
