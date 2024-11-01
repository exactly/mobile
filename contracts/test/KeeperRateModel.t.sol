// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest } from "./Fork.t.sol";
import { FixedLib } from "@exactly/protocol/Market.sol";

import { DeployKeeperRateModel } from "../script/KeeperRateModel.s.sol";
import { InvalidRange, KeeperRateModel } from "../src/KeeperRateModel.sol";

contract KeeperRateModelTest is ForkTest {
  KeeperRateModel internal model;

  // solhint-disable func-name-mixedcase

  function test_fuzz_refRate(uint256 nMaturities, uint256[] memory amounts, uint256 firstMaturity) external {
    nMaturities = _bound(nMaturities, 1, 24);
    uint256 nextMaturity = block.timestamp + FixedLib.INTERVAL - (block.timestamp % FixedLib.INTERVAL);
    amounts = new uint256[](nMaturities);
    for (uint256 i = 0; i < nMaturities; ++i) {
      amounts[i] = _bound(amounts[i], 1, type(uint32).max);
    }
    firstMaturity = _bound(firstMaturity, nextMaturity, nextMaturity + 12 * FixedLib.INTERVAL);
    model = deployDefault();

    uint256 amountsByTime = 0;
    uint256 total = 0;
    for (uint256 i = 0; i < amounts.length; ++i) {
      amountsByTime += amounts[i] * (firstMaturity + FixedLib.INTERVAL * i - block.timestamp);
      total += amounts[i];
    }
    string[] memory ffi = new string[](2);
    ffi[0] = "script/keeper-rate-model.sh";
    ffi[1] = encodeHex(
      abi.encode(
        model.DURATION_START(),
        model.DURATION_END(),
        model.DURATION_GROWTH(),
        model.RATE_START(),
        model.RATE_END(),
        model.MIN_RATE(),
        model.LINEAR_RATIO(),
        amountsByTime,
        total
      )
    );

    uint256 refRate = abi.decode(vm.ffi(ffi), (uint256));
    uint256 rate = model.rate(amountsByTime * 1e18 / total);

    assertApproxEqRel(rate, refRate, 1e2, "rate != refRate");
  }

  function test_invalidRangeDeploy_reverts() external {
    model = deployDefault();
    uint256 durationStart = model.DURATION_START();
    uint256 durationEnd = model.DURATION_END();
    uint256 durationGrowth = model.DURATION_GROWTH();
    uint256 rateStart = model.RATE_START();
    uint256 rateEnd = model.RATE_END();
    uint256 minRate = model.MIN_RATE();
    uint256 linearRatio = model.LINEAR_RATIO();

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperRateModel(durationStart, durationStart, durationGrowth, rateStart, rateEnd, minRate, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperRateModel(durationStart, durationEnd, 10e18 + 1, rateStart, rateEnd, minRate, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperRateModel(durationStart, durationEnd, durationGrowth, rateStart, rateStart, minRate, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperRateModel(durationStart, durationEnd, durationGrowth, rateStart, rateStart, minRate, 1e18 + 1);
  }

  // solhint-enable func-name-mixedcase

  function encodeHex(bytes memory raw) internal pure returns (string memory) {
    bytes16 symbols = "0123456789abcdef";
    bytes memory buffer = new bytes(2 * raw.length + 2);
    buffer[0] = "0";
    buffer[1] = "x";
    for (uint256 i = 0; i < raw.length; i++) {
      buffer[2 * i + 2] = symbols[uint8(raw[i]) >> 4];
      buffer[2 * i + 3] = symbols[uint8(raw[i]) & 0xf];
    }
    return string(buffer);
  }

  function deployDefault() internal returns (KeeperRateModel) {
    DeployKeeperRateModel krm = new DeployKeeperRateModel();
    krm.run();
    return krm.keeperRateModel();
  }
}
