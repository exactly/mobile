// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { Test, stdError } from "forge-std/Test.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { InterestRateModel } from "@exactly/protocol/InterestRateModel.sol";
import { FixedLib, Market } from "@exactly/protocol/Market.sol";
import { MockBalancerVault } from "@exactly/protocol/mocks/MockBalancerVault.sol";
import { MockInterestRateModel } from "@exactly/protocol/mocks/MockInterestRateModel.sol";
import { MockPriceFeed } from "@exactly/protocol/mocks/MockPriceFeed.sol";
import { DebtManager, IBalancerVault, IPermit2 } from "@exactly/protocol/periphery/DebtManager.sol";

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";
import { IEntryPoint } from "modular-account/src/interfaces/erc4337/IEntryPoint.sol";

import { UserOperation } from "modular-account-libs/interfaces/UserOperation.sol";

import { ERC1967Proxy } from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";

import { ExaPlugin, FunctionId } from "../src/ExaPlugin.sol";
import { BorrowLimitExceeded, IAuditor, IExaAccount, IMarket, NotAuthorized } from "../src/IExaAccount.sol";

// TODO use mock asset with price != 1
// TODO use price feed for that asset with 8 decimals
// TODO add the debt manager to the plugin so we can roll fixed to floating
contract ExaPluginTest is Test {
  using OwnersLib for address[];
  using ECDSA for bytes32;

  address internal owner;
  uint256 internal ownerKey;
  address internal keeper;
  uint256 internal keeperKey;
  address[] internal owners;
  address payable internal collector;
  ExaAccount internal account;
  IEntryPoint internal entryPoint;
  ExaPlugin internal exaPlugin;

  Auditor internal auditor;
  IMarket internal market;
  IMarket internal marketUSDC;
  MockERC20 internal asset;
  MockERC20 internal usdc;
  DebtManager internal debtManager;

  function setUp() external {
    auditor = Auditor(address(new ERC1967Proxy(address(new Auditor(18)), "")));
    auditor.initialize(Auditor.LiquidationIncentive(0.09e18, 0.01e18));
    vm.label(address(auditor), "Auditor");
    InterestRateModel irm = InterestRateModel(address(new MockInterestRateModel(0.1e18)));
    // exa
    asset = new MockERC20("Exactly Token", "EXA", 18);
    vm.label(address(asset), "EXA");
    market = IMarket(address(new ERC1967Proxy(address(new Market(asset, auditor)), "")));
    Market(address(market)).initialize("EXA", 3, 1e18, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(market), "MarketEXA");
    auditor.enableMarket(Market(address(market)), new MockPriceFeed(18, 5e18), 0.8e18);
    // usdc
    usdc = new MockERC20("USD Coin", "USDC", 6);
    vm.label(address(usdc), "USDC");
    marketUSDC = IMarket(address(new ERC1967Proxy(address(new Market(usdc, auditor)), "")));
    Market(address(marketUSDC)).initialize("USDC", 3, 1e6, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(marketUSDC), "MarketUSDC");
    auditor.enableMarket(Market(address(marketUSDC)), new MockPriceFeed(18, 1e18), 0.9e18);

    IBalancerVault balancer = IBalancerVault(address(new MockBalancerVault()));
    asset.mint(address(balancer), 1_000_000e18);
    debtManager =
      DebtManager(address(new ERC1967Proxy(address(new DebtManager(auditor, IPermit2(address(0)), balancer)), "")));
    debtManager.initialize();
    vm.label(address(debtManager), "DebtManager");

    entryPoint = IEntryPoint(address(new EntryPoint()));
    collector = payable(makeAddr("collector"));
    (owner, ownerKey) = makeAddrAndKey("owner");
    owners = new address[](1);
    owners[0] = owner;
    (keeper, keeperKey) = makeAddrAndKey("keeper");
    vm.label(keeper, "keeper");

    exaPlugin = new ExaPlugin(IAuditor(address(auditor)), collector);
    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

    WebauthnOwnerPlugin ownerPlugin = new WebauthnOwnerPlugin();
    ExaAccountFactory factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(entryPoint)), entryPoint
    );

    account = ExaAccount(payable(factory.createAccount(0, owners.toPublicKeys())));
    vm.deal(address(account), 10_000 ether);
    vm.label(address(account), "account");

    asset.mint(address(account), 10_000e18);
    usdc.mint(address(account), 100_000e6);
  }

  function testEnterMarketSuccess() external {
    vm.prank(keeper);
    account.enterMarket(market);

    assertEq(auditor.accountMarkets(address(account)), 1);
  }

  function testEnterMarketNotKeeper() external {
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(NotAuthorized.selector)
      )
    );
    account.enterMarket(market);
  }

  function testDepositSuccess() external {
    vm.startPrank(keeper);
    account.approve(market, 100 ether);
    account.deposit(market, 100 ether);

    assertEq(market.maxWithdraw(address(account)), 100 ether);
  }

  function testDepositNotKeeper() external {
    vm.prank(keeper);
    account.approve(market, 100 ether);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(NotAuthorized.selector)
      )
    );
    account.deposit(market, 100 ether);
  }

  function testBorrowSuccess() external {
    vm.startPrank(keeper);
    account.approve(market, 100 ether);
    account.deposit(market, 100 ether);

    uint256 prevBalance = asset.balanceOf(collector);
    uint256 borrowAmount = 10 ether;
    account.borrow(market, borrowAmount);
    assertEq(asset.balanceOf(collector), prevBalance + borrowAmount);
  }

  function testBorrowLimitExceeded() external {
    vm.startPrank(keeper);
    account.approve(market, 2000 ether);
    account.deposit(market, 2000 ether);

    account.borrow(market, 200 ether);

    vm.expectRevert(BorrowLimitExceeded.selector);
    account.borrow(market, 1 ether);
  }

  function testBorrowCrossMarketSuccess() external {
    address bob = address(0x420);
    vm.startPrank(bob);
    usdc.mint(bob, 10_000e6);
    usdc.approve(address(marketUSDC), 10_000e6);
    marketUSDC.deposit(10_000e6, bob);

    vm.startPrank(keeper);
    account.approve(market, 2000 ether);
    account.deposit(market, 2000 ether);
    account.enterMarket(market);

    uint256 balance = usdc.balanceOf(collector);
    account.borrow(marketUSDC, 1000e6);
    assertEq(usdc.balanceOf(collector), balance + 1000e6);
  }

  function testBorrowCrossMarketLimitExceeded() external {
    address bob = address(0x420);
    vm.startPrank(bob);
    usdc.mint(bob, 10_000e6);
    usdc.approve(address(marketUSDC), 10_000e6);
    marketUSDC.deposit(10_000e6, bob);

    vm.startPrank(keeper);
    account.approve(market, 2000 ether);
    account.deposit(market, 2000 ether);
    account.enterMarket(market);

    account.borrow(marketUSDC, 1000e6);

    vm.expectRevert(BorrowLimitExceeded.selector);
    account.borrow(marketUSDC, 1e6);
  }

  function testBorrowAtMaturitySuccess() external {
    vm.startPrank(keeper);
    account.approve(market, 100 ether);
    account.deposit(market, 100 ether);

    uint256 prevBalance = asset.balanceOf(collector);
    uint256 borrowAmount = 10 ether;
    account.borrowAtMaturity(market, FixedLib.INTERVAL, borrowAmount, 100 ether);
    assertEq(asset.balanceOf(collector), prevBalance + borrowAmount);
  }

  function testBorrowAtMaturityLimitExceeded() external {
    vm.startPrank(keeper);
    account.approve(market, 2000 ether);
    account.deposit(market, 2000 ether);

    account.borrowAtMaturity(market, FixedLib.INTERVAL, 200 ether, 210 ether);

    vm.expectRevert(BorrowLimitExceeded.selector);
    account.borrowAtMaturity(market, FixedLib.INTERVAL, 1 ether, 1.1 ether);
  }

  function testBorrowAtMaturityAsNotKeeper() external {
    vm.prank(keeper);
    account.approve(market, 100 ether);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(NotAuthorized.selector)
      )
    );
    account.borrowAtMaturity(market, FixedLib.INTERVAL, 10 ether, 100 ether);
  }

  function testWithdrawSuccess() external {
    vm.startPrank(keeper);
    account.approve(market, 100 ether);
    account.deposit(market, 100 ether);

    uint256 prevBalance = asset.balanceOf(collector);
    account.withdraw(market, 100 ether);
    assertEq(asset.balanceOf(collector), prevBalance + 100 ether);
  }

  function testWithdrawFailure() external {
    vm.startPrank(keeper);
    account.approve(market, 100 ether);
    account.deposit(market, 100 ether);

    vm.expectRevert(stdError.arithmeticError);
    account.withdraw(market, 200 ether);
  }

  function testWithdrawNotKeeper() external {
    vm.prank(keeper);
    account.approve(market, 100 ether);

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.RuntimeValidationFunctionReverted.selector,
        exaPlugin,
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(NotAuthorized.selector)
      )
    );
    account.withdraw(market, 100 ether);
  }

  function testKeeperUserOp() external {
    UserOperation[] memory ops = new UserOperation[](6);
    ops[0] = _op(abi.encodeCall(IExaAccount.enterMarket, (market)), keeperKey);
    ops[1] = _op(abi.encodeCall(IExaAccount.approve, (market, 420)), keeperKey, 1);
    ops[2] = _op(abi.encodeCall(IExaAccount.deposit, (market, 420)), keeperKey, 2);
    ops[3] = _op(abi.encodeCall(IExaAccount.withdraw, (market, 69)), keeperKey, 3);
    ops[4] = _op(abi.encodeCall(IExaAccount.borrow, (market, 69)), keeperKey, 4);
    ops[5] = _op(abi.encodeCall(IExaAccount.borrowAtMaturity, (market, FixedLib.INTERVAL, 69, 420)), keeperKey, 5);

    entryPoint.handleOps(ops, payable(this));

    assertEq(market.balanceOf(address(account)), 420 - 69);
    assertEq(asset.balanceOf(collector), 69 + 69 + 69);
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
    op.signature = _sign(privateKey, entryPoint.getUserOpHash(op).toEthSignedMessageHash());
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

  function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks
}

abstract contract ExaAccount is UpgradeableModularAccount, IExaAccount { } // solhint-disable-line no-empty-blocks
