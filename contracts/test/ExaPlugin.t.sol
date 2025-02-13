// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest, stdError } from "./Fork.t.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { FixedLib, Market } from "@exactly/protocol/Market.sol";

import {
  Call,
  PluginManagerInternals,
  UpgradeableModularAccount
} from "modular-account/src/account/UpgradeableModularAccount.sol";

import { FunctionReference } from "modular-account-libs/interfaces/IPluginManager.sol";
import { UserOperation } from "modular-account-libs/interfaces/UserOperation.sol";

import { IAccessControl } from "openzeppelin-contracts/contracts/access/IAccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import { Address } from "openzeppelin-contracts/contracts/utils/Address.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";

import {
  ExaPlugin, FunctionId, IBalancerVault, IDebtManager, IInstallmentsRouter, ZeroAddress
} from "../src/ExaPlugin.sol";
import {
  AllowedTargetSet,
  CollectorSet,
  Expired,
  FixedPosition,
  IAuditor,
  IExaAccount,
  IMarket,
  InsufficientLiquidity,
  NoProposal,
  Proposed,
  SwapProposed,
  Timelocked,
  Unauthorized,
  UninstallProposed,
  UninstallRevoked,
  Uninstalling
} from "../src/IExaAccount.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { Refunder } from "../src/Refunder.sol";

import { DeployIssuerChecker } from "../script/IssuerChecker.s.sol";
import { DeployRefunder } from "../script/Refunder.s.sol";

import { DeployAccount, ENTRYPOINT } from "./mocks/Account.s.sol";

import { MockSwapper } from "./mocks/MockSwapper.sol";
import { DeployMocks } from "./mocks/Mocks.s.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

// solhint-disable-next-line max-states-count
contract ExaPluginTest is ForkTest {
  using FixedPointMathLib for uint256;
  using OwnersLib for address[];
  using Address for address;
  using ECDSA for bytes32;

  address internal owner;
  uint256 internal ownerKey;
  address internal keeper;
  uint256 internal keeperKey;
  address internal issuer;
  uint256 internal issuerKey;
  address[] internal owners;
  address payable internal collector;
  ExaAccount internal account;
  ExaPlugin internal exaPlugin;
  WebauthnOwnerPlugin internal ownerPlugin;
  IssuerChecker internal issuerChecker;
  bytes32 internal domainSeparator;
  Refunder internal refunder;

  Auditor internal auditor;
  IMarket internal exaEXA;
  IMarket internal exaUSDC;
  IMarket internal exaWETH;
  MockERC20 internal exa;
  MockERC20 internal usdc;

  function setUp() external {
    collector = payable(makeAddr("collector"));
    (owner, ownerKey) = makeAddrAndKey("owner");
    owners = new address[](1);
    owners[0] = owner;
    (keeper, keeperKey) = makeAddrAndKey("keeper");
    (issuer, issuerKey) = makeAddrAndKey("issuer");

    new DeployAccount().run();
    DeployProtocol p = new DeployProtocol();
    p.run();
    auditor = p.auditor();
    exaEXA = IMarket(address(p.exaEXA()));
    exaUSDC = IMarket(address(p.exaUSDC()));
    exaWETH = IMarket(address(p.exaWETH()));
    exa = p.exa();
    usdc = p.usdc();

    DeployIssuerChecker ic = new DeployIssuerChecker();
    set("issuer", issuer);
    ic.run();
    unset("issuer");
    issuerChecker = ic.issuerChecker();

    DeployMocks m = new DeployMocks();
    set("Auditor", address(auditor));
    set("USDC", address(usdc));
    m.run();
    unset("Auditor");
    unset("USDC");

    DeployRefunder r = new DeployRefunder();
    set("MarketUSDC", address(exaUSDC));
    set("IssuerChecker", address(issuerChecker));
    set("keeper", keeper);
    r.run();
    unset("MarketUSDC");
    unset("IssuerChecker");
    unset("keeper");
    refunder = r.refunder();

    exaPlugin = new ExaPlugin(
      address(this),
      IAuditor(address(auditor)),
      exaUSDC,
      exaWETH,
      p.balancer(),
      IDebtManager(address(p.debtManager())),
      IInstallmentsRouter(address(p.installmentsRouter())),
      issuerChecker,
      collector,
      address(m.swapper()),
      keeper
    );

    exaPlugin.setAllowedTarget(address(exa), true);

    ownerPlugin = new WebauthnOwnerPlugin();
    ExaAccountFactory factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(ENTRYPOINT)), ENTRYPOINT
    );

    account = ExaAccount(payable(factory.createAccount(0, owners.toPublicKeys())));
    vm.deal(address(account), 10_000 ether);
    vm.label(address(account), "account");

    exa.mint(address(account), 10_000e18);
    usdc.mint(address(account), 100_000e6);

    address bob = address(0xb0b);
    vm.startPrank(bob);
    usdc.mint(bob, 10_000e6);
    usdc.approve(address(exaUSDC), 10_000e6);
    exaUSDC.deposit(10_000e6, bob);

    domainSeparator = issuerChecker.DOMAIN_SEPARATOR();

    vm.stopPrank();
  }

  // solhint-disable func-name-mixedcase

  // self runtime validation
  function test_propose_emitsProposed() external {
    uint256 amount = 1;
    address receiver = address(0x420);

    vm.startPrank(owner);

    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit Proposed(address(account), exaEXA, receiver, amount, block.timestamp + exaPlugin.PROPOSAL_DELAY());
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));
  }

  function test_proposeSwap_emitsSwapProposed() external {
    uint256 amount = 1;
    bytes memory route = bytes("route");

    vm.startPrank(owner);

    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit SwapProposed(
      address(account), exaEXA, IERC20(address(usdc)), amount, 1, route, block.timestamp + exaPlugin.PROPOSAL_DELAY()
    );
    account.execute(
      address(account), 0, abi.encodeCall(IExaAccount.proposeSwap, (exaEXA, IERC20(address(usdc)), amount, 1, route))
    );
  }

  function test_proposeUninstall_emitsUninstallProposed() external {
    vm.startPrank(owner);
    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit UninstallProposed(address(account), block.timestamp + exaPlugin.PROPOSAL_DELAY());
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.proposeUninstall, ()));
  }

  function test_proposeUninstall_deactivatesLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.proposeUninstall, ()));

    vm.startPrank(keeper);
    vm.expectRevert(Uninstalling.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
  }

  function test_revokeUninstall_emits_UninstallRevoked() external {
    vm.startPrank(owner);
    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit UninstallRevoked(address(account));
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.revokeUninstall, ()));
  }

  function test_revokeUninstall_reactivatesLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.proposeUninstall, ()));

    vm.startPrank(keeper);
    vm.expectRevert(Uninstalling.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.revokeUninstall, ()));

    vm.startPrank(keeper);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
  }

  function test_swap_swaps() external {
    uint256 prevUSDC = usdc.balanceOf(address(account));
    uint256 prevEXA = exa.balanceOf(address(account));

    uint256 maxAmountIn = 111e18;
    uint256 amountOut = 110e6;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), maxAmountIn, address(usdc), amountOut, address(account))
    );
    vm.startPrank(address(account));
    account.swap(IERC20(exaEXA.asset()), IERC20(address(usdc)), maxAmountIn, amountOut, route);

    assertEq(usdc.balanceOf(address(account)), prevUSDC + amountOut);
    assertGe(exa.balanceOf(address(account)), prevEXA - maxAmountIn);
  }

  function testFork_swap_swaps() external {
    _setUpLifiFork();
    uint256 amount = 0.0004e8;
    IERC20 wbtc = IERC20(protocol("WBTC"));
    deal(address(wbtc), address(account), amount);
    exaPlugin.setAllowedTarget(address(wbtc), true);

    bytes memory route = bytes.concat(
      hex"4666fc80b7c64668375a12ff485d0a88dee3ac5d82d77587a6be542b9233c5eb13830c4c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000",
      abi.encodePacked(address(account)),
      hex"00000000000000000000000000000000000000000000000000000000018f7705000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000034578610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000004e807ed2379000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000018f770400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000039600000000000000000000000000000000000000000000000000000000037800a007e5c0d20000000000000000000000000000000000000000000000000003540000f051204c4af8dbc524681930a27b2f1af5bcc8062e6fb768f180fcce6836688e9084f035309e29bf0a209500447dc2038200000000000000000000000068f180fcce6836688e9084f035309e29bf0a209500000000000000000000000042000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002495763e3d93b6000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000042f527f50f16a103b6ccab48bccca214500c102100a0c9e75c480000000000000013130c0000000000000000000000000000000000000000000002360001d300006302a000000000000000000000000000000000000000000000000000000000005f6305ee63c1e580c1738d90e2e26c35784a0d3e3d8a9f795074bca44200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a655106a062ae8a9c5e11aaa026fc2670b0d65ccc8b285842000000000000000000000000000000000000060004cac88ea9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009708bd00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000000000000000000000000000000000000671fb839000000000000000000000000000000000000000000000000000000000000000100000000000000000000000042000000000000000000000000000000000000060000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1046053aa5682b4f9a81b5481394da16be5ff5a02a0000000000000000000000000000000000000000000000000000000000097095eee63c1e580d4cb5566b5c16ef2f4a08b1438052013171212a24200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a65000000000000000000002a94d114000000000000000000000000000000000000000000000000"
    );

    uint256 minAmount = 26_310_887;
    vm.startPrank(address(account));
    account.swap(wbtc, IERC20(address(usdc)), amount, minAmount, route);
    assertGe(usdc.balanceOf(address(account)), minAmount, "usdc dust");
  }

  function test_swap_reverts_withDisagreement() external {
    uint256 prevUSDC = usdc.balanceOf(address(account));
    uint256 prevEXA = exa.balanceOf(address(account));

    uint256 amountIn = 111e18;
    uint256 amountOut = 110e6;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), amountIn, address(usdc), amountOut, address(account))
    );
    vm.startPrank(address(account));
    vm.expectRevert(Disagreement.selector);
    account.swap(IERC20(address(exa)), IERC20(address(usdc)), amountIn, amountOut * 2, route);

    assertEq(usdc.balanceOf(address(account)), prevUSDC);
    assertEq(exa.balanceOf(address(account)), prevEXA);
  }

  // keeper or self runtime validation

  function test_repay_repaysX() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 100e6);
    uint256 positionAssets = position.principal + position.fee;

    vm.startPrank(owner);
    account.execute(
      address(account), 0, abi.encodeCall(IExaAccount.repay, (maturity, positionAssets, positionAssets + 1))
    );
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 0);
  }

  function test_repay_partiallyRepays() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 100e6);
    uint256 positionAssets = position.principal + position.fee;

    vm.startPrank(owner);
    account.execute(
      address(account), 0, abi.encodeCall(IExaAccount.repay, (maturity, positionAssets / 2, positionAssets / 2))
    );
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 50e6);
    assertEq(position.principal + position.fee, positionAssets / 2);
  }

  function test_repay_repays_whenKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 100e6);
    uint256 positionAssets = position.principal + position.fee;

    account.repay(maturity, positionAssets, positionAssets + 1);
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 0);
    assertEq(position.fee, 0);
  }

  function test_repay_partiallyRepays_whenKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 100e6);
    uint256 positionAssets = position.principal + position.fee;

    account.repay(maturity, positionAssets / 2, positionAssets / 2);
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertEq(position.principal, 50e6);
    assertEq(position.principal + position.fee, positionAssets / 2);
  }

  function test_crossRepay_repays() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    uint256 prevCollateral = exaEXA.balanceOf(address(account));
    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    assertGt(position.principal, 0);

    uint256 amountIn = 111e18;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), amountIn, address(usdc), 110e6, address(exaPlugin))
    );
    vm.startPrank(address(account));
    account.proposeCrossRepay(maturity, 110e6, 110e6, exaEXA, amountIn, route);

    skip(exaPlugin.PROPOSAL_DELAY());
    account.executeProposal();

    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    assertGt(exaUSDC.balanceOf(address(account)), 0, "left usdc not deposited");
    assertGt(prevCollateral, exaEXA.balanceOf(address(account)), "collateral didn't decrease");
    assertEq(exaUSDC.fixedBorrowPositions(maturity, address(account)).principal, 0, "debt not fully repaid");
    assertEq(exaUSDC.fixedBorrowPositions(maturity, address(account)).fee, 0, "debt not fully repaid");
  }

  // FIXME
  // function testFork_crossRepay_repays() external {
  //   _setUpLifiFork();
  //   uint256 amount = 0.0004e8;
  //   IMarket exaWBTC = IMarket(protocol("MarketWBTC"));
  //   deal(address(exaWBTC), address(account), amount);

  //   uint256 maturity = block.timestamp + 2 * FixedLib.INTERVAL - (block.timestamp % FixedLib.INTERVAL);

  //   bytes memory route = bytes.concat(
  //     hex"4666fc80b7c64668375a12ff485d0a88dee3ac5d82d77587a6be542b9233c5eb13830c4c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000",
  //     abi.encodePacked(address(exaPlugin)),
  //     hex"00000000000000000000000000000000000000000000000000000000018f7705000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000034578610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000004e807ed2379000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000018f770400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000039600000000000000000000000000000000000000000000000000000000037800a007e5c0d20000000000000000000000000000000000000000000000000003540000f051204c4af8dbc524681930a27b2f1af5bcc8062e6fb768f180fcce6836688e9084f035309e29bf0a209500447dc2038200000000000000000000000068f180fcce6836688e9084f035309e29bf0a209500000000000000000000000042000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002495763e3d93b6000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000042f527f50f16a103b6ccab48bccca214500c102100a0c9e75c480000000000000013130c0000000000000000000000000000000000000000000002360001d300006302a000000000000000000000000000000000000000000000000000000000005f6305ee63c1e580c1738d90e2e26c35784a0d3e3d8a9f795074bca44200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a655106a062ae8a9c5e11aaa026fc2670b0d65ccc8b285842000000000000000000000000000000000000060004cac88ea9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009708bd00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000000000000000000000000000000000000671fb839000000000000000000000000000000000000000000000000000000000000000100000000000000000000000042000000000000000000000000000000000000060000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1046053aa5682b4f9a81b5481394da16be5ff5a02a0000000000000000000000000000000000000000000000000000000000097095eee63c1e580d4cb5566b5c16ef2f4a08b1438052013171212a24200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a65000000000000000000002a94d114000000000000000000000000000000000000000000000000"
  //   );
  //   uint256 prevCollateral = exaWBTC.balanceOf(address(account));
  //   FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
  //   uint256 prevPrincipal = position.principal;
  //   assertGt(prevPrincipal, 0);

  //   vm.startPrank(address(account));
  //   account.proposeCrossRepay(maturity, 21e6, 25e6, exaWBTC, amount, route);

  //   skip(exaPlugin.PROPOSAL_DELAY());
  //   account.crossRepay();

  //   assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
  //   assertGt(prevCollateral, exaWBTC.balanceOf(address(account)), "collateral didn't decrease");

  //   position = exaUSDC.fixedBorrowPositions(maturity, address(account));
  //   assertGt(prevPrincipal, position.principal, "fixed debt didn't decrease");
  // }

  function test_crossRepay_repays_whenKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    uint256 prevCollateral = exaEXA.balanceOf(address(account));
    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    uint256 prevPrincipal = position.principal;
    assertGt(prevPrincipal, 0);

    uint256 amountIn = 111e18;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), amountIn, address(usdc), 110e6, address(exaPlugin))
    );
    vm.startPrank(address(account));
    account.proposeCrossRepay(maturity, 110e6, 110e6, exaEXA, amountIn, route);

    skip(exaPlugin.PROPOSAL_DELAY());
    vm.startPrank(keeper);
    account.executeProposal();

    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    assertGt(exaUSDC.balanceOf(address(account)), 0, "left usdc not deposited");
    assertGt(prevCollateral, exaEXA.balanceOf(address(account)), "collateral didn't decrease");
    assertEq(exaUSDC.fixedBorrowPositions(maturity, address(account)).principal, 0, "debt not fully repaid");
  }

  function test_crossRepay_reverts_whenNotKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(maturity, address(account));
    uint256 prevPrincipal = position.principal;
    assertGt(prevPrincipal, 0);

    uint256 amountIn = 111e18;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), amountIn, address(usdc), 110e6, address(account))
    );
    vm.startPrank(address(account));
    account.proposeCrossRepay(maturity, 110e6, 110e6, exaEXA, amountIn, route);

    skip(exaPlugin.PROPOSAL_DELAY());
    vm.startPrank(vm.addr(0x1));
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER_OR_SELF,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.executeProposal();
  }

  function test_crossRepay_reverts_whenDisagreement() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    uint256 maturity = FixedLib.INTERVAL;
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (address(exaEXA.asset()), 60e18, address(usdc), 10e6, address(account))
    );

    vm.startPrank(address(account));
    account.proposeCrossRepay(maturity, 110e6, 110e6, exaEXA, 60e18, route);

    skip(exaPlugin.PROPOSAL_DELAY());
    vm.expectRevert(Disagreement.selector);
    account.executeProposal();
  }

  function test_rollDebt_rolls() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    uint256 assets = 100e6;
    uint256 maxAssets = 110e6;
    account.collectCredit(FixedLib.INTERVAL, assets, block.timestamp, _issuerOp(assets, block.timestamp));

    vm.startPrank(address(account));
    account.proposeRollDebt(FixedLib.INTERVAL, FixedLib.INTERVAL * 2, maxAssets, maxAssets, 1e18);
    skip(exaPlugin.PROPOSAL_DELAY());
    account.executeProposal();

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL, address(account));
    assertEq(position.principal, 0);
    assertEq(position.fee, 0);
    position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL * 2, address(account));
    assertGt(position.principal, assets);
    assertGt(position.fee, 0);
    assertLe(position.principal, maxAssets);
  }

  function test_rollDebt_rolls_asKeeper() external {
    vm.startPrank(keeper);

    account.poke(exaUSDC);
    uint256 assets = 100e6;
    uint256 maxAssets = 110e6;
    account.collectCredit(FixedLib.INTERVAL, assets, maxAssets, block.timestamp, _issuerOp(assets, block.timestamp));

    vm.startPrank(address(account));
    account.proposeRollDebt(FixedLib.INTERVAL, FixedLib.INTERVAL * 2, maxAssets, maxAssets, 1e18);

    skip(exaPlugin.PROPOSAL_DELAY());

    vm.startPrank(keeper);
    account.executeProposal();

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL, address(account));
    assertEq(position.principal, 0);
    assertEq(position.fee, 0);
    position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL * 2, address(account));
    assertGt(position.principal, assets);
    assertGt(position.fee, 0);
    assertLe(position.principal, maxAssets);
  }

  function test_marketWithdraw_transfersAsset_asOwner() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(receiver), 0);
    vm.prank(owner);
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, receiver, address(account))));
    assertEq(exa.balanceOf(receiver), amount, "receiver balance doesn't match");
  }

  function test_withdraw_transfersAsset_asKeeper() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(receiver), 0);
    vm.prank(keeper);
    account.executeProposal();
    assertEq(exa.balanceOf(receiver), amount);
  }

  function test_withdraw_withdrawsProposed() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.startPrank(address(account));
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(receiver), 0);
    account.executeProposal();
    assertEq(exa.balanceOf(receiver), amount);
  }

  function test_withdraw_swapsProposed() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    account.poke(exaUSDC);

    uint256 amount = 100 ether;
    uint256 minAmountOut = 490e6;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountIn, (address(exaEXA.asset()), amount, address(usdc), minAmountOut, address(account))
    );
    vm.startPrank(address(account));
    account.execute(
      address(account),
      0,
      abi.encodeCall(IExaAccount.proposeSwap, (exaEXA, IERC20(address(usdc)), amount, minAmountOut, route))
    );

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(usdc.balanceOf(address(account)), 0);
    account.executeProposal();
    assertGe(usdc.balanceOf(address(account)), minAmountOut, "usdc balance != min amount out");
  }

  function test_withdraw_transfersETH() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.pokeETH();

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaWETH, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(receiver.balance, 0);
    vm.prank(keeper);
    account.executeProposal();
    assertEq(receiver.balance, amount);
  }

  function test_withdraw_swapsWETH() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    account.pokeETH();

    uint256 amount = 1 ether;
    uint256 minAmountOut = 2450e6;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountIn, (address(exaWETH.asset()), amount, address(usdc), minAmountOut, address(account))
    );
    vm.startPrank(address(account));
    account.execute(
      address(account),
      0,
      abi.encodeCall(IExaAccount.proposeSwap, (exaWETH, IERC20(address(usdc)), amount, minAmountOut, route))
    );

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(usdc.balanceOf(address(account)), 0);
    account.executeProposal();
    assertGe(usdc.balanceOf(address(account)), minAmountOut);
  }

  function test_withdraw_reverts_whenReceiverIsContractAndMarketNotWETH() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(receiver), 0);
    vm.startPrank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(this), address(account))));
  }

  function test_withdraw_reverts_whenNoProposal() external {
    uint256 amount = 1;
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(account), address(account))));
  }

  function test_withdraw_reverts_whenNoProposalKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(NoProposal.selector);
    account.executeProposal();
  }

  function test_withdraw_reverts_whenTimelocked() external {
    uint256 amount = 1;
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, address(account))));

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(Timelocked.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(account), address(account))));
  }

  function test_withdraw_reverts_whenTimelockedKeeper() external {
    uint256 amount = 1;
    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, address(account))));

    vm.prank(keeper);
    vm.expectRevert(Timelocked.selector);
    account.executeProposal();
  }

  function test_withdraw_reverts_whenWrongAmount() external {
    uint256 amount = 1;
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, address(account))));
    skip(exaPlugin.PROPOSAL_DELAY());

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(
      address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount + 1, address(account), address(account)))
    );
  }

  function test_withdraw_reverts_whenWrongMarket() external {
    uint256 amount = 1;
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, amount, address(account))));

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(account), address(account))));
  }

  function test_withdraw_reverts_whenWrongReceiver() external {
    uint256 amount = 1;
    address receiver = address(0x420);
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));
    skip(exaPlugin.PROPOSAL_DELAY());

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(0x123), address(account))));
  }

  function test_withdraw_reverts_whenNotKeeper() external {
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER_OR_SELF,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.executeProposal();
  }

  function test_withdraw_reverts_whenTimelockedETH() external {
    address receiver = address(0x420);
    vm.prank(keeper);
    account.pokeETH();

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaWETH, 100 ether, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY() - 1);

    assertEq(receiver.balance, 0);
    vm.startPrank(keeper);
    vm.expectRevert(Timelocked.selector);
    account.executeProposal();
    assertEq(receiver.balance, 0);
  }

  // keeper runtime validation
  function test_collectCredit_collects() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectCredit_collects_withPrevIssuerSignature() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    bytes memory prevIssuerSignature = _issuerOp(100e6, block.timestamp);

    vm.startPrank(acct("admin"));
    issuerChecker.setIssuer(address(0x420));

    vm.startPrank(keeper);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, prevIssuerSignature);
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectCredit_reverts_whenPrevSignatureNotValidAnymore() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    bytes memory prevIssuerSignature = _issuerOp(100e6, block.timestamp);

    vm.startPrank(acct("admin"));
    issuerChecker.setIssuer(address(0x420));

    skip(issuerChecker.prevIssuerWindow() + 1);

    vm.startPrank(keeper);
    vm.expectRevert(Unauthorized.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, prevIssuerSignature);
  }

  function test_collectCredit_toleratesTimeDrift() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    assertEq(usdc.balanceOf(collector), 0);

    uint256 timestamp = block.timestamp + 1 minutes;
    account.collectCredit(FixedLib.INTERVAL, 100e6, timestamp, _issuerOp(100e6, timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectCredit_reverts_whenTimelocked() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 timestamp = block.timestamp + 1 minutes + 1;
    vm.expectRevert(Timelocked.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, timestamp, _issuerOp(100e6, timestamp));
  }

  function test_collectCredit_reverts_whenExpired() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    skip(1 days);
    uint256 timestamp = block.timestamp - exaPlugin.ISSUER_CHECKER().operationExpiry() - 1;
    vm.expectRevert(Expired.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, timestamp, _issuerOp(100e6, timestamp));
  }

  function test_collectCredit_reverts_whenReplay() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    bytes memory signature = _issuerOp(100e6, block.timestamp);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, signature);
    vm.expectRevert(Expired.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, signature);
  }

  function test_collectCredit_reverts_asNotKeeper() external {
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.collectCredit(FixedLib.INTERVAL, 1, block.timestamp, _issuerOp(1, block.timestamp));
  }

  function test_collectCredit_passes_whenProposalLeavesEnoughLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 propose = exaUSDCBalance.mulWad(0.8e18);
    (uint256 adjustFactor,,,,) = auditor.markets(Market(address(exaUSDC)));

    uint256 credit = (exaUSDCBalance - propose).mulWad(adjustFactor) / 2;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, propose, receiver)));

    vm.startPrank(keeper);
    account.collectCredit(FixedLib.INTERVAL, credit, block.timestamp, _issuerOp(credit, block.timestamp));

    assertEq(usdc.balanceOf(collector), credit);
  }

  function test_collectCredit_reverts_whenProposalCausesInsufficientLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 propose = exaUSDCBalance.mulWad(0.8e18);
    uint256 credit = exaUSDCBalance - propose;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, propose, receiver)));

    vm.startPrank(keeper);
    vm.expectRevert(InsufficientLiquidity.selector);
    account.collectCredit(FixedLib.INTERVAL, credit, block.timestamp, _issuerOp(credit, block.timestamp));

    assertEq(usdc.balanceOf(collector), 0);
  }

  function test_collectCredit_collects_whenHealthFactorHigherThanOne() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 credit = exaUSDCBalance / 2;

    account.collectCredit(FixedLib.INTERVAL, credit, block.timestamp, _issuerOp(credit, block.timestamp));

    assertEq(usdc.balanceOf(collector), credit);
  }

  function test_collectCredit_reverts_whenHealthFactorLowerThanOne() external {
    vm.prank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 credit = exaUSDCBalance / 2;

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, credit, address(this))));

    vm.prank(keeper);
    vm.expectRevert(InsufficientLiquidity.selector);
    account.collectCredit(FixedLib.INTERVAL, credit, block.timestamp, _issuerOp(credit, block.timestamp));
  }

  function test_collectCredit_reverts_whenDisagreement() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    vm.expectRevert(Disagreement.selector);
    account.collectCredit(FixedLib.INTERVAL, 100e6, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    assertEq(usdc.balanceOf(collector), 0);
  }

  function test_collectCredit_collects_withEnoughSlippage() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    account.collectCredit(FixedLib.INTERVAL, 100e6, 110e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectDebit_collects() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    assertEq(usdc.balanceOf(collector), 0);
    account.collectDebit(100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectDebit_toleratesTimeDrift() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    assertEq(usdc.balanceOf(collector), 0);

    uint256 timestamp = block.timestamp + 1 minutes;
    account.collectDebit(100e6, timestamp, _issuerOp(100e6, timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
  }

  function test_collectDebit_reverts_whenTimelocked() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 timestamp = block.timestamp + 1 minutes + 1;
    vm.expectRevert(Timelocked.selector);
    account.collectDebit(100e6, timestamp, _issuerOp(100e6, timestamp));
  }

  function test_collectDebit_reverts_whenExpired() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    skip(1 days);
    uint256 timestamp = block.timestamp - exaPlugin.ISSUER_CHECKER().operationExpiry() - 1;
    vm.expectRevert(Expired.selector);
    account.collectDebit(100e6, timestamp, _issuerOp(100e6, timestamp));
  }

  function test_collectDebit_reverts_whenReplay() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    bytes memory signature = _issuerOp(100e6, block.timestamp);
    account.collectDebit(100e6, block.timestamp, signature);
    vm.expectRevert(Expired.selector);
    account.collectDebit(100e6, block.timestamp, signature);
  }

  function test_collectDebit_reverts_asNotKeeper() external {
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.collectDebit(1, block.timestamp, _issuerOp(1, block.timestamp));
  }

  function test_collectDebit_collects_whenProposalLeavesEnoughLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 propose = exaUSDCBalance.mulWad(0.8e18);
    uint256 debit = exaUSDCBalance - propose;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, propose, receiver)));

    vm.startPrank(keeper);
    account.collectDebit(debit, block.timestamp, _issuerOp(debit, block.timestamp));
    assertEq(usdc.balanceOf(collector), debit);
    assertEq(usdc.balanceOf(collector), debit);
  }

  function test_collectDebit_reverts_whenProposalCausesInsufficientLiquidity() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 propose = exaUSDCBalance.mulWad(0.8e18);
    uint256 debit = exaUSDCBalance - propose + 1;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaUSDC, propose, receiver)));

    vm.startPrank(keeper);
    vm.expectRevert(InsufficientLiquidity.selector);
    account.collectDebit(debit, block.timestamp, _issuerOp(debit, block.timestamp));
    assertEq(usdc.balanceOf(collector), 0);
  }

  function test_collectCollateral_collects() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    uint256 prevCollateral = exaEXA.balanceOf(address(account));

    uint256 maxAmountIn = 111e18;
    uint256 minAmountOut = 110e6;
    bytes memory route = abi.encodeCall(
      MockSwapper.swapExactAmountOut, (exaEXA.asset(), maxAmountIn, address(usdc), minAmountOut, address(exaPlugin))
    );
    uint256 balance = usdc.balanceOf(exaPlugin.collector());
    (uint256 amountIn, uint256 amountOut) = account.collectCollateral(
      minAmountOut, exaEXA, maxAmountIn, block.timestamp, route, _issuerOp(minAmountOut, block.timestamp)
    );

    assertEq(usdc.balanceOf(exaPlugin.collector()), balance + minAmountOut, "collector's usdc != expected");
    assertEq(exaUSDC.balanceOf(address(account)), amountOut - minAmountOut, "account's usdc != expected");
    assertEq(exaEXA.balanceOf(address(account)), prevCollateral - amountIn, "account's collateral != expected");

    assertEq(exaEXA.balanceOf(address(exaPlugin)), 0, "collateral dust");
    assertEq(IERC20(exaEXA.asset()).balanceOf(address(exaPlugin)), 0, "collateral asset dust");
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc asset dust");
    assertEq(exaUSDC.balanceOf(address(exaPlugin)), 0, "usdc dust");
  }

  function testFork_collectCollateral_collects() external {
    _setUpLifiFork();
    uint256 maxAmountIn = 0.0004e8;
    IMarket exaWBTC = IMarket(protocol("MarketWBTC"));
    deal(exaWBTC.asset(), address(account), maxAmountIn);
    exaPlugin.setAllowedTarget(exaWBTC.asset(), true);

    vm.startPrank(keeper);
    account.poke(exaWBTC);

    bytes memory route = bytes.concat(
      hex"4666fc80b7c64668375a12ff485d0a88dee3ac5d82d77587a6be542b9233c5eb13830c4c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000",
      abi.encodePacked(address(exaPlugin)),
      hex"00000000000000000000000000000000000000000000000000000000018f7705000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000034578610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000004e807ed2379000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000018f770400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000039600000000000000000000000000000000000000000000000000000000037800a007e5c0d20000000000000000000000000000000000000000000000000003540000f051204c4af8dbc524681930a27b2f1af5bcc8062e6fb768f180fcce6836688e9084f035309e29bf0a209500447dc2038200000000000000000000000068f180fcce6836688e9084f035309e29bf0a209500000000000000000000000042000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002495763e3d93b6000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000042f527f50f16a103b6ccab48bccca214500c102100a0c9e75c480000000000000013130c0000000000000000000000000000000000000000000002360001d300006302a000000000000000000000000000000000000000000000000000000000005f6305ee63c1e580c1738d90e2e26c35784a0d3e3d8a9f795074bca44200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a655106a062ae8a9c5e11aaa026fc2670b0d65ccc8b285842000000000000000000000000000000000000060004cac88ea9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009708bd00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000000000000000000000000000000000000671fb839000000000000000000000000000000000000000000000000000000000000000100000000000000000000000042000000000000000000000000000000000000060000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1046053aa5682b4f9a81b5481394da16be5ff5a02a0000000000000000000000000000000000000000000000000000000000097095eee63c1e580d4cb5566b5c16ef2f4a08b1438052013171212a24200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a65000000000000000000002a94d114000000000000000000000000000000000000000000000000"
    );

    uint256 balance = usdc.balanceOf(exaPlugin.collector());
    account.collectCollateral(
      21e6, exaWBTC, maxAmountIn, block.timestamp, route, _issuerOp(21e6, block.timestamp, false, true)
    );
    assertEq(usdc.balanceOf(exaPlugin.collector()) - balance, 21e6);
  }

  function test_collectInstallments_collects() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    uint256[] memory amounts = new uint256[](3);
    amounts[0] = 10e6;
    amounts[1] = 10e6;
    amounts[2] = 10e6;

    account.collectInstallments(
      FixedLib.INTERVAL, amounts, type(uint256).max, block.timestamp, _issuerOp(30e6, block.timestamp)
    );

    assertEq(usdc.balanceOf(collector), 30e6);
  }

  function test_collectInstallments_toleratesTimeDrift() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    assertEq(usdc.balanceOf(collector), 0);

    uint256 timestamp = block.timestamp + 1 minutes;
    uint256[] memory amounts = new uint256[](3);
    amounts[0] = 10e6;
    amounts[1] = 10e6;
    amounts[2] = 10e6;

    account.collectInstallments(FixedLib.INTERVAL, amounts, type(uint256).max, timestamp, _issuerOp(30e6, timestamp));
    assertEq(usdc.balanceOf(collector), 30e6);
  }

  function test_collectInstallments_reverts_whenTimelocked() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 timestamp = block.timestamp + 1 minutes + 1;
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = 10e6;
    amounts[1] = 10e6;
    vm.expectRevert(Timelocked.selector);
    account.collectInstallments(FixedLib.INTERVAL, amounts, type(uint256).max, timestamp, _issuerOp(20e6, timestamp));
  }

  function test_collectInstallments_reverts_whenExpired() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    skip(1 days);
    uint256 timestamp = block.timestamp - exaPlugin.ISSUER_CHECKER().operationExpiry() - 1;
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = 10e6;
    amounts[1] = 10e6;
    vm.expectRevert(Expired.selector);
    account.collectInstallments(FixedLib.INTERVAL, amounts, type(uint256).max, timestamp, _issuerOp(20e6, timestamp));
  }

  function test_collectInstallments_reverts_whenReplay() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    bytes memory signature = _issuerOp(20e6, block.timestamp);
    uint256[] memory amounts = new uint256[](2);
    amounts[0] = 10e6;
    amounts[1] = 10e6;

    account.collectInstallments(FixedLib.INTERVAL, amounts, type(uint256).max, block.timestamp, signature);
    vm.expectRevert(Expired.selector);
    account.collectInstallments(FixedLib.INTERVAL, amounts, type(uint256).max, block.timestamp, signature);
  }

  function test_collectInstallments_reverts_asNotKeeper() external {
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.collectInstallments(
      FixedLib.INTERVAL, new uint256[](0), type(uint256).max, block.timestamp, _issuerOp(0, block.timestamp)
    );
  }

  function test_collectInstallments_revertsWhenNoSlippage() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    uint256[] memory amounts = new uint256[](3);
    amounts[0] = 10e6;
    amounts[1] = 10e6;
    amounts[2] = 10e6;

    vm.expectRevert(stdError.arithmeticError);
    account.collectInstallments(FixedLib.INTERVAL, amounts, 30e6, block.timestamp, _issuerOp(30e6, block.timestamp));

    assertEq(usdc.balanceOf(collector), 0);
  }

  function test_poke() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
  }

  function test_pokeETH_deposits() external {
    uint256 balance = address(account).balance;

    vm.startPrank(keeper);
    account.pokeETH();

    assertEq(address(account).balance, 0, "ETH unwrapped");
    assertEq(exaWETH.maxWithdraw(address(account)), balance, "WETH left");
  }

  // runtime validations
  function test_exitMarket_reverts() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    vm.startPrank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.execute(address(auditor), 0, abi.encodeCall(IAuditor.exitMarket, exaEXA));
  }

  function test_auditorCalls_passes() external {
    vm.startPrank(owner);
    account.execute(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
  }

  function test_targetNotAllowed_reverts_withUnauthorized() external {
    vm.startPrank(owner);

    MockERC20 erc20 = new MockERC20("Mock", "MTK", 18);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.execute(address(erc20), 0, abi.encodeCall(IERC20.transfer, (address(account), 100e18)));

    vm.stopPrank();
    erc20.mint(address(account), 100e18);

    exaPlugin.setAllowedTarget(address(erc20), true);

    vm.startPrank(owner);
    account.execute(address(erc20), 0, abi.encodeCall(IERC20.transfer, (address(account), 100e18)));
  }

  function test_borrow_reverts_withUnauthorized_whenReceiverNotCollector() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    vm.startPrank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.execute(address(exaUSDC), 0, abi.encodeCall(IMarket.borrow, (100e6, owner, owner)));
  }

  function test_borrowAtMaturity_reverts_withUnauthorized_whenReceiverNotCollector() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    vm.startPrank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.execute(
      address(exaUSDC), 0, abi.encodeCall(IMarket.borrowAtMaturity, (FixedLib.INTERVAL, 100e6, 100e6, owner, owner))
    );
  }

  function test_executeBatch_checksEveryCall() external {
    Call[] memory calls = new Call[](4);
    calls[0] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[1] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[2] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[3] = Call(address(auditor), 0, abi.encodeCall(IAuditor.exitMarket, exaEXA));

    vm.startPrank(owner);
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.executeBatch(calls);

    calls = new Call[](3);
    calls[0] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[1] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[2] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));

    account.executeBatch(calls);
  }

  function test_executeBatch_supportsMultipleWithdrawsBetweenOps() external {
    vm.prank(keeper);
    account.poke(exaEXA);
    uint256 amount = 30e18;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());
    assertEq(exa.balanceOf(receiver), 0);

    Call[] memory calls = new Call[](6);
    calls[0] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3, receiver, address(account))));
    calls[1] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[2] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3, receiver, address(account))));
    calls[3] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[4] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3, receiver, address(account))));
    calls[5] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));

    account.executeBatch(calls);
    assertEq(exa.balanceOf(receiver), amount, "receiver balance doesn't match");
  }

  function test_executeBatch_reverts_whenWithdrawingWrongAmount() external {
    vm.prank(keeper);
    account.poke(exaEXA);
    uint256 amount = 30e18;
    address receiver = address(0x420);

    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());
    assertEq(exa.balanceOf(receiver), 0);

    Call[] memory calls = new Call[](6);
    calls[0] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3, receiver, address(account))));
    calls[1] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[2] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3, receiver, address(account))));
    calls[3] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));
    calls[4] = Call(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount / 3 + 1, receiver, address(account))));
    calls[5] = Call(address(auditor), 0, abi.encodeCall(IAuditor.enterMarket, exaEXA));

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PostExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION,
        abi.encodePacked(stdError.arithmeticError)
      )
    );
    account.executeBatch(calls);
    assertEq(exa.balanceOf(receiver), 0, "receiver balance doesn't match");
  }

  // base plugin
  function test_onUninstall_uninstalls() external {
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.proposeUninstall, ()));

    skip(exaPlugin.PROPOSAL_DELAY());
    account.uninstallPlugin(address(exaPlugin), "", "");
    address[] memory plugins = account.getInstalledPlugins();
    assertEq(plugins.length, 1);
    assertEq(plugins[0], address(ownerPlugin));
  }

  function test_onUninstall_reverts_whenTimelocked() external {
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.proposeUninstall, ()));

    vm.expectRevert(
      abi.encodeWithSelector(
        PluginManagerInternals.PluginUninstallCallbackFailed.selector,
        exaPlugin,
        abi.encodeWithSelector(Timelocked.selector)
      )
    );
    account.uninstallPlugin(address(exaPlugin), "", "");

    skip(exaPlugin.PROPOSAL_DELAY());
    account.uninstallPlugin(address(exaPlugin), "", "");
  }

  // refunder
  function test_refund_refunds() external {
    vm.startPrank(keeper);

    uint256 balance = exaUSDC.balanceOf(address(account));
    deal(address(usdc), address(refunder), 100e6);
    refunder.refund(address(account), 100e6, block.timestamp + 1, _issuerOp(100e6, block.timestamp + 1, true, false));
    assertEq(exaUSDC.balanceOf(address(account)), balance + 100e6);
  }

  // admin functions
  function test_setCollector_sets_whenAdmin() external {
    exaPlugin.setCollector(address(0x1));
    assertEq(exaPlugin.collector(), address(0x1));
  }

  function test_setCollector_reverts_whenNotAdmin() external {
    address nonAdmin = address(0x1);
    vm.startPrank(nonAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, nonAdmin, exaPlugin.DEFAULT_ADMIN_ROLE()
      )
    );
    exaPlugin.setCollector(address(0x2));
  }

  function test_setCollector_reverts_whenAddressZero() external {
    vm.expectRevert(ZeroAddress.selector);
    exaPlugin.setCollector(address(0));
  }

  function test_setCollector_emitsCollectorSet() external {
    address newCollector = address(0x1);
    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit CollectorSet(newCollector, address(this));
    exaPlugin.setCollector(newCollector);
  }

  function test_setAllowedTarget_sets_whenAdmin() external {
    address target = address(0x1);
    exaPlugin.setAllowedTarget(target, true);
    assert(exaPlugin.allowlist(target));
  }

  function test_setAllowedTarget_reverts_whenNotAdmin() external {
    address nonAdmin = address(0x1);
    vm.startPrank(nonAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, nonAdmin, exaPlugin.DEFAULT_ADMIN_ROLE()
      )
    );
    exaPlugin.setAllowedTarget(address(0x1), true);
  }

  function test_setAllowedTarget_reverts_whenAddressZero() external {
    vm.expectRevert(ZeroAddress.selector);
    exaPlugin.setAllowedTarget(address(0), true);
  }

  function test_setAllowedTarget_emitsAllowedTargetSet() external {
    address target = address(0x1);
    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit AllowedTargetSet(target, address(this), true);
    exaPlugin.setAllowedTarget(target, true);

    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit AllowedTargetSet(target, address(this), false);
    exaPlugin.setAllowedTarget(target, false);
  }

  // solhint-enable func-name-mixedcase

  function _issuerOp(uint256 amount, uint256 timestamp) internal view returns (bytes memory signature) {
    return _issuerOp(amount, timestamp, false, false);
  }

  function _issuerOp(uint256 amount, uint256 timestamp, bool refund, bool legacyFork)
    internal
    view
    returns (bytes memory signature)
  {
    if (legacyFork) {
      return _sign(
        issuerKey,
        keccak256(
          abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            keccak256(
              abi.encode(
                keccak256("Operation(address account,uint256 amount,uint40 timestamp)"), account, amount, timestamp
              )
            )
          )
        )
      );
    }
    if (refund) {
      return _sign(
        issuerKey,
        keccak256(
          abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            keccak256(
              abi.encode(
                keccak256("Refund(address account,uint256 amount,uint40 timestamp)"), account, amount, timestamp
              )
            )
          )
        )
      );
    }
    return _sign(
      issuerKey,
      keccak256(
        abi.encodePacked(
          "\x19\x01",
          domainSeparator,
          keccak256(
            abi.encode(
              keccak256("Collection(address account,uint256 amount,uint40 timestamp)"), account, amount, timestamp
            )
          )
        )
      )
    );
  }

  function _op(bytes memory callData, uint256 privateKey) internal view returns (UserOperation memory op) {
    op = _op(callData, privateKey, 0);
  }

  function _op(bytes memory callData, uint256 privateKey, uint256 index)
    internal
    view
    returns (UserOperation memory op)
  {
    op = _unsignedOp(callData, index);
    op.signature = _sign(privateKey, ENTRYPOINT.getUserOpHash(op).toEthSignedMessageHash());
  }

  function _setUpLifiFork() internal {
    vm.createSelectFork("optimism", 127_050_624);
    account = ExaAccount(payable(0x6120Fb2A9d47f7955298b80363F00C620dB9f6E6));
    issuerChecker = IssuerChecker(broadcast("IssuerChecker"));
    vm.prank(acct("deployer"));
    issuerChecker.setIssuer(issuer);
    domainSeparator = issuerChecker.DOMAIN_SEPARATOR();

    exaPlugin = new ExaPlugin(
      address(this),
      IAuditor(protocol("Auditor")),
      IMarket(protocol("MarketUSDC")),
      IMarket(protocol("MarketWETH")),
      IBalancerVault(protocol("BalancerVault")),
      IDebtManager(protocol("DebtManager")),
      IInstallmentsRouter(protocol("InstallmentsRouter")),
      IssuerChecker(broadcast("IssuerChecker")),
      acct("collector"),
      0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE,
      keeper
    );

    usdc = MockERC20(protocol("USDC"));
    exaUSDC = IMarket(protocol("MarketUSDC"));

    vm.startPrank(address(account));
    account.execute(
      address(account),
      0,
      abi.encodeCall(UpgradeableModularAccount.uninstallPlugin, (0x9aac010e4EE770168182A4a65E07aab36b1cA526, "", ""))
    );
    account.execute(
      address(account),
      0,
      abi.encodeCall(
        UpgradeableModularAccount.installPlugin,
        (address(exaPlugin), keccak256(abi.encode(exaPlugin.pluginManifest())), "", new FunctionReference[](0))
      )
    );
    vm.stopPrank();
  }

  function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  function _unsignedOp(bytes memory callData, uint256 index) internal view returns (UserOperation memory op) {
    op = UserOperation({
      sender: address(account),
      nonce: account.getNonce() + index,
      initCode: "",
      callData: callData,
      callGasLimit: 1 << 24,
      verificationGasLimit: 1 << 24,
      preVerificationGas: 1 << 24,
      maxFeePerGas: 1 << 8,
      maxPriorityFeePerGas: 1 << 8,
      paymasterAndData: "",
      signature: ""
    });
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks
}

abstract contract ExaAccount is UpgradeableModularAccount, IExaAccount { } // solhint-disable-line no-empty-blocks

error Disagreement();
