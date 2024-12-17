// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20; // solhint-disable-line one-contract-per-file

import {
  IVelodromeFactory,
  IVelodromePool,
  InsufficientInputAmount,
  InsufficientOutputAmount
} from "./MockVelodromeFactory.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockSwapper {
  using SafeERC20 for IERC20;

  IVelodromeFactory public immutable VELODROME_FACTORY;

  constructor(IVelodromeFactory velodromeFactory) {
    VELODROME_FACTORY = velodromeFactory;
  }

  function swapExactAmountOut(address tokenIn, uint256 maxAmountIn, address tokenOut, uint256 amountOut)
    external
    returns (uint256 amountIn)
  {
    address pool = VELODROME_FACTORY.getPool(tokenIn, tokenOut, false);
    uint24 swapFee = VELODROME_FACTORY.getFee(pool, false);
    bool isToken0 = tokenOut > tokenIn;
    amountIn = _getAmountIn(pool, amountOut, isToken0, swapFee);
    if (amountIn > maxAmountIn) revert InsufficientInputAmount();

    IERC20(tokenIn).safeTransferFrom(msg.sender, pool, amountIn);
    IVelodromePool(pool).swap(isToken0 ? 0 : amountOut, isToken0 ? amountOut : 0, msg.sender, "");
  }

  function swapExactAmountIn(address tokenIn, uint256 amountIn, address tokenOut, uint256 minAmountOut)
    external
    returns (uint256 amountOut)
  {
    address pool = VELODROME_FACTORY.getPool(tokenIn, tokenOut, false);
    uint24 swapFee = VELODROME_FACTORY.getFee(pool, false);
    bool isToken0 = tokenOut > tokenIn;
    amountOut = _getAmountOut(pool, amountIn, isToken0, swapFee);
    if (amountOut < minAmountOut) revert InsufficientOutputAmount();

    IERC20(tokenIn).safeTransferFrom(msg.sender, pool, amountIn);
    IVelodromePool(pool).swap(isToken0 ? 0 : amountOut, isToken0 ? amountOut : 0, msg.sender, "");
  }

  function _getAmountIn(address pool, uint256 amountOut, bool isToken0, uint256 fee) internal view returns (uint256) {
    (uint256 reserve0, uint256 reserve1,) = IVelodromePool(pool).getReserves();
    return (
      isToken0
        ? (reserve0 * amountOut * 10_000) / ((reserve1 - amountOut) * (10_000 - fee))
        : (reserve1 * amountOut * 10_000) / ((reserve0 - amountOut) * (10_000 - fee))
    ) + 1;
  }

  function _getAmountOut(address pool, uint256 amountIn, bool isToken0, uint256 fee) internal view returns (uint256) {
    (uint256 reserve0, uint256 reserve1,) = IVelodromePool(pool).getReserves();
    return (
      isToken0
        ? (reserve1 * amountIn * (10_000 - fee)) / (reserve0 * 10_000 + amountIn * (10_000 - fee))
        : (reserve0 * amountIn * (10_000 - fee)) / (reserve1 * 10_000 + amountIn * (10_000 - fee))
    );
  }
}
