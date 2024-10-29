// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { ForkTest } from "./Fork.t.sol";

import { ICollectableMarket, InstallmentsPreviewer } from "../src/InstallmentsPreviewer.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

contract InstallmentsPreviewerTest is ForkTest {
  ICollectableMarket internal exaUSDC;
  InstallmentsPreviewer internal previewer;

  function setUp() external {
    DeployProtocol p = new DeployProtocol();
    p.run();
    exaUSDC = ICollectableMarket(address(p.exaUSDC()));
    previewer = new InstallmentsPreviewer(exaUSDC);
  }

  // solhint-disable func-name-mixedcase

  function test_preview_returns() external view {
    previewer.preview();
  }

  // solhint-enable func-name-mixedcase
}
