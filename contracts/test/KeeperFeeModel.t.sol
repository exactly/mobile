// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest } from "./Fork.t.sol";
import { FixedLib } from "@exactly/protocol/Market.sol";

import { DeployKeeperFeeModel } from "../script/KeeperFeeModel.s.sol";
import { KeeperFeeModel } from "../src/KeeperFeeModel.sol";

contract KeeperFeeModelTest is ForkTest {
  KeeperFeeModel internal model;

  // solhint-disable func-name-mixedcase

  function test_single() external {
    model = deployDefault();
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1000e6;
    uint256 firstMaturity = block.timestamp + FixedLib.INTERVAL - (block.timestamp % FixedLib.INTERVAL);
    uint256 fee = model.calculateFee(amounts, firstMaturity);
    string[] memory ffi = new string[](2);
    ffi[0] = "script/keeper-fee-model.sh";
    ffi[1] = encodeHex(
      abi.encode(
        model.DURATION_END(),
        model.DURATION_GROWTH(),
        model.DURATION_START(),
        model.FEE_END(),
        model.FEE_START(),
        model.LINEAR_PROPORTION(),
        model.MIN_FEE(),
        amounts[0] * (firstMaturity - block.timestamp), // 0.08408e18,
        amounts[0] // 0.02998e18
      )
    );

    uint256 refFee = abi.decode(vm.ffi(ffi), (uint256));
    emit log_named_decimal_uint("fee    ", fee, 18);
    emit log_named_decimal_uint("refFee ", refFee, 18);
    assertApproxEqRel(fee, refFee, 0.002e16, "fee != refFee");
  }

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
        model.DURATION_END(),
        model.DURATION_GROWTH(),
        model.DURATION_START(),
        model.FEE_END(),
        model.FEE_START(),
        model.LINEAR_PROPORTION(),
        model.MIN_FEE(),
        amountsByTime,
        total
      )
    );

    uint256 refFee = abi.decode(vm.ffi(ffi), (uint256));
    uint256 fee = model.calculateFee(amounts, firstMaturity);

    assertApproxEqRel(fee, refFee, 0.002e16, "fee != refFee");
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

  function deployRandom(Parameters memory p, uint256 firstMaturity, uint256 nMaturities)
    internal
    returns (KeeperFeeModel)
  {
    p.durationStart = _bound(p.durationStart, 1, firstMaturity);
    p.durationEnd = _bound(p.durationEnd, p.durationStart, firstMaturity + FixedLib.INTERVAL * nMaturities);
    p.durationGrowth = _bound(p.durationGrowth, 0, 10e18);
    p.feeStart = _bound(p.feeStart, 1, type(uint32).max / 2);
    p.feeEnd = _bound(p.feeEnd, p.feeStart, type(uint32).max);
    p.linearProportion = _bound(p.linearProportion, 0, 1e18);
    p.minFee = _bound(p.minFee, 1, type(uint32).max);
    return new KeeperFeeModel(
      p.durationEnd, p.durationGrowth, p.durationStart, p.feeEnd, p.feeStart, p.linearProportion, p.minFee
    );
  }
}

struct Parameters {
  uint256 durationEnd;
  uint256 durationGrowth;
  uint256 durationStart;
  uint256 feeEnd;
  uint256 feeStart;
  uint256 linearProportion;
  uint256 minFee;
}
