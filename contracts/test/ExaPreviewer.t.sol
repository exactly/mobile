// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { ForkTest } from "./Fork.t.sol";

import { DeployExaPreviewer } from "../script/ExaPreviewer.s.sol";
import { ExaPreviewer, ICollectableMarket } from "../src/ExaPreviewer.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

contract ExaPreviewerTest is ForkTest {
  ICollectableMarket internal exaUSDC;
  ExaPreviewer internal previewer;

  function setUp() external {
    DeployProtocol p = new DeployProtocol();
    p.run();
    exaUSDC = ICollectableMarket(address(p.exaUSDC()));

    DeployExaPreviewer ep = new DeployExaPreviewer();
    set("MarketUSDC", address(exaUSDC));
    ep.run();
    unset("MarketUSDC");
    previewer = ep.previewer();
  }

  // solhint-disable func-name-mixedcase

  function test_utilizations_returns() external view {
    previewer.utilizations();
  }

  // solhint-enable func-name-mixedcase
}
