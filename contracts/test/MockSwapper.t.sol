// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { ForkTest } from "./Fork.t.sol";
import { MockSwapper } from "./mocks/MockSwapper.sol";
import { DeployMocks } from "./mocks/Mocks.s.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

contract MockSwapperTest is ForkTest {
  MockSwapper internal mockSwapper;
  MockERC20 internal exa;
  MockERC20 internal usdc;

  function setUp() external {
    DeployProtocol p = new DeployProtocol();
    p.run();
    exa = p.exa();
    usdc = p.usdc();

    DeployMocks m = new DeployMocks();
    set("Auditor", address(p.auditor()));
    set("USDC", address(usdc));
    m.run();
    unset("Auditor");
    unset("USDC");
    mockSwapper = m.swapper();

    exa.mint(address(this), 10_000e18);
    usdc.mint(address(this), 10_000e6);
  }

  // solhint-disable func-name-mixedcase

  function test_swapExactAmountOut_swaps() external {
    uint256 balanceOut = usdc.balanceOf(address(this));
    uint256 balanceIn = exa.balanceOf(address(this));
    uint256 amountOut = 100e6;
    exa.approve(address(mockSwapper), type(uint256).max);
    uint256 expectedIn = mockSwapper.getAmountIn(address(exa), amountOut, address(usdc));
    uint256 amountIn =
      mockSwapper.swapExactAmountOut(address(exa), type(uint256).max, address(usdc), amountOut, address(this));
    assertEq(expectedIn, amountIn);
    assertEq(usdc.balanceOf(address(this)), balanceOut + amountOut);
    assertEq(exa.balanceOf(address(this)), balanceIn - amountIn);
  }

  function test_swapExactAmountIn_swaps() external {
    uint256 balanceOut = usdc.balanceOf(address(this));
    uint256 balanceIn = exa.balanceOf(address(this));
    uint256 amountIn = 100e18;
    exa.approve(address(mockSwapper), type(uint256).max);
    uint256 expectedOut = mockSwapper.getAmountOut(address(exa), amountIn, address(usdc));
    uint256 amountOut = mockSwapper.swapExactAmountIn(address(exa), amountIn, address(usdc), 0, address(this));
    assertEq(amountOut, expectedOut);
    assertEq(usdc.balanceOf(address(this)), balanceOut + amountOut);
    assertEq(exa.balanceOf(address(this)), balanceIn - amountIn);
  }

  // solhint-enable func-name-mixedcase
}
