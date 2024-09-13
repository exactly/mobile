// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { InterestRateModel } from "@exactly/protocol/InterestRateModel.sol";
import { Market } from "@exactly/protocol/Market.sol";
import { MockBalancerVault } from "@exactly/protocol/mocks/MockBalancerVault.sol";
import { MockInterestRateModel } from "@exactly/protocol/mocks/MockInterestRateModel.sol";
import { MockPriceFeed } from "@exactly/protocol/mocks/MockPriceFeed.sol";

import { ERC1967Proxy } from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { MockWETH } from "@exactly/protocol/mocks/MockWETH.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { BaseScript } from "../../script/Base.s.sol";
import { IBalancerVault } from "../../src/ExaPlugin.sol";
import { MockVelodromeFactory, MockVelodromePool } from "./MockVelodromeFactory.sol";

contract DeployProtocol is BaseScript {
  Auditor public auditor;
  Market public exaEXA;
  Market public exaUSDC;
  Market public exaWETH;
  MockERC20 public exa;
  MockERC20 public usdc;
  MockWETH public weth;

  IBalancerVault public balancer;
  MockVelodromeFactory public velodromeFactory;

  function run() external {
    vm.startBroadcast();

    auditor = Auditor(address(new ERC1967Proxy(address(new Auditor(18)), "")));
    auditor.initialize(Auditor.LiquidationIncentive(0.09e18, 0.01e18));
    vm.label(address(auditor), "Auditor");
    InterestRateModel irm = InterestRateModel(address(new MockInterestRateModel(0.1e18)));
    exa = new MockERC20("exactly", "EXA", 18);
    vm.label(address(exa), "EXA");
    exaEXA = Market(address(new ERC1967Proxy(address(new Market(exa, auditor)), "")));
    Market(address(exaEXA)).initialize("EXA", 3, 1e18, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(exaEXA), "exaEXA");
    auditor.enableMarket(Market(address(exaEXA)), new MockPriceFeed(18, 5e18), 0.8e18);
    usdc = new MockERC20("USD Coin", "USDC", 6);
    vm.label(address(usdc), "USDC");
    exaUSDC = Market(address(new ERC1967Proxy(address(new Market(usdc, auditor)), "")));
    Market(address(exaUSDC)).initialize("USDC", 3, 1e6, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(exaUSDC), "exaUSDC");
    auditor.enableMarket(Market(address(exaUSDC)), new MockPriceFeed(18, 1e18), 0.9e18);
    weth = new MockWETH();
    vm.label(address(weth), "WETH");
    exaWETH = Market(address(new ERC1967Proxy(address(new Market(weth, auditor)), "")));
    Market(address(exaWETH)).initialize("WETH", 3, 1e6, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(exaWETH), "exaWETH");
    auditor.enableMarket(Market(address(exaWETH)), new MockPriceFeed(18, 2500e18), 0.86e18);

    balancer = IBalancerVault(address(new MockBalancerVault()));
    exa.mint(address(balancer), 1_000_000e18);
    usdc.mint(address(balancer), 1_000_000e6);
    vm.label(address(balancer), "BalancerVault");

    velodromeFactory = new MockVelodromeFactory();
    MockVelodromePool pool = velodromeFactory.createPool(address(exa), address(usdc), false);
    exa.mint(address(pool), 1_000_000e18);
    usdc.mint(address(pool), 1_000_000e6);
    pool.poke();
    vm.label(address(velodromeFactory), "VelodromeFactory");
    vm.label(address(pool), "EXA/USDC");

    vm.stopBroadcast();
  }
}
