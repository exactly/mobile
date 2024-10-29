// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { ForkTest } from "./Fork.t.sol";

import { LibString } from "solady/utils/LibString.sol";

import { DeployInstallmentsPreviewer } from "../script/InstallmentsPreviewer.s.sol";
import { ICollectableMarket, InstallmentsPreviewer } from "../src/InstallmentsPreviewer.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

contract InstallmentsPreviewerTest is ForkTest {
  using LibString for address;

  ICollectableMarket internal exaUSDC;
  InstallmentsPreviewer internal previewer;

  function setUp() external {
    vm.setEnv("DEPLOYER_ADDRESS", address(this).toHexString());

    DeployProtocol p = new DeployProtocol();
    p.run();
    exaUSDC = ICollectableMarket(address(p.exaUSDC()));
    vm.setEnv("PROTOCOL_MARKETUSDC_ADDRESS", address(exaUSDC).toHexString());

    DeployInstallmentsPreviewer ip = new DeployInstallmentsPreviewer();
    ip.run();
    previewer = ip.installmentsPreviewer();
  }

  // solhint-disable func-name-mixedcase

  function test_preview_returns() external view {
    previewer.preview();
  }

  // solhint-enable func-name-mixedcase
}
