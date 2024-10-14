// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest } from "./Fork.t.sol";
import { FixedLib } from "@exactly/protocol/Market.sol";

import { DeployKeeperFeeModel } from "../script/KeeperFeeModel.s.sol";
import { InvalidRange, KeeperFeeModel } from "../src/KeeperFeeModel.sol";

contract KeeperFeeModelTest is ForkTest {
  KeeperFeeModel internal model;

  // solhint-disable func-name-mixedcase

  function test_fuzz_refFee(uint256 nMaturities, uint256[] memory amounts, uint256 firstMaturity) external {
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
    ffi[0] = "script/keeper-fee-model.sh";
    ffi[1] = encodeHex(
      abi.encode(
        model.DURATION_START(),
        model.DURATION_END(),
        model.DURATION_GROWTH(),
        model.FEE_START(),
        model.FEE_END(),
        model.MIN_FEE(),
        model.LINEAR_RATIO(),
        amountsByTime,
        total
      )
    );

    uint256 refFee = abi.decode(vm.ffi(ffi), (uint256));
    uint256 fee = model.calculateFee(amounts, firstMaturity);

    assertApproxEqRel(fee, refFee, 0.002e16, "fee != refFee");
  }

  function test_invalidRangeDeploy_reverts() external {
    model = deployDefault();
    uint256 durationStart = model.DURATION_START();
    uint256 durationEnd = model.DURATION_END();
    uint256 durationGrowth = model.DURATION_GROWTH();
    uint256 feeStart = model.FEE_START();
    uint256 feeEnd = model.FEE_END();
    uint256 minFee = model.MIN_FEE();
    uint256 linearRatio = model.LINEAR_RATIO();

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperFeeModel(durationStart, durationStart, durationGrowth, feeStart, feeEnd, minFee, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperFeeModel(durationStart, durationEnd, 10e18 + 1, feeStart, feeEnd, minFee, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperFeeModel(durationStart, durationEnd, durationGrowth, feeStart, feeStart, minFee, linearRatio);

    vm.expectRevert(InvalidRange.selector);
    model = new KeeperFeeModel(durationStart, durationEnd, durationGrowth, feeStart, feeStart, minFee, 1e18 + 1);

    // solhint-enable func-name-mixedcase
  }

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

  function deployDefault() internal returns (KeeperFeeModel) {
    DeployKeeperFeeModel kfm = new DeployKeeperFeeModel();
    kfm.run();
    return kfm.keeperFeeModel();
  }
}
