// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest } from "./Fork.t.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { InterestRateModel } from "@exactly/protocol/InterestRateModel.sol";
import { FixedLib, Market } from "@exactly/protocol/Market.sol";
import { MockBalancerVault } from "@exactly/protocol/mocks/MockBalancerVault.sol";
import { MockInterestRateModel } from "@exactly/protocol/mocks/MockInterestRateModel.sol";
import { MockPriceFeed } from "@exactly/protocol/mocks/MockPriceFeed.sol";
import { DebtManager, IBalancerVault as IBalancerVaultDM, IPermit2 } from "@exactly/protocol/periphery/DebtManager.sol";

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";
import { IEntryPoint } from "modular-account/src/interfaces/erc4337/IEntryPoint.sol";

import { UserOperation } from "modular-account-libs/interfaces/UserOperation.sol";

import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import { ERC1967Proxy } from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";

import { ExaPlugin, FunctionId, IBalancerVault, IVelodromeFactory } from "../src/ExaPlugin.sol";
import {
  Expired,
  IAuditor,
  IExaAccount,
  IMarket,
  NoProposal,
  Proposed,
  Timelocked,
  Unauthorized
} from "../src/IExaAccount.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

// TODO use mock asset with price != 1
// TODO use price feed for that asset with 8 decimals
// TODO add the debt manager to the plugin so we can roll fixed to floating
// solhint-disable-next-line max-states-count
contract ExaPluginTest is ForkTest {
  using OwnersLib for address[];
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
  IEntryPoint internal entryPoint;
  ExaPlugin internal exaPlugin;
  WebauthnOwnerPlugin internal ownerPlugin;
  IssuerChecker internal issuerChecker;
  bytes32 internal domainSeparator;

  Auditor internal auditor;
  IMarket internal exaEXA;
  IMarket internal exaUSDC;
  MockERC20 internal exa;
  MockERC20 internal usdc;
  DebtManager internal debtManager;

  function setUp() external {
    auditor = Auditor(address(new ERC1967Proxy(address(new Auditor(18)), "")));
    auditor.initialize(Auditor.LiquidationIncentive(0.09e18, 0.01e18));
    vm.label(address(auditor), "Auditor");
    InterestRateModel irm = InterestRateModel(address(new MockInterestRateModel(0.1e18)));
    // exa
    exa = new MockERC20("Exactly Token", "EXA", 18);
    vm.label(address(exa), "EXA");
    exaEXA = IMarket(address(new ERC1967Proxy(address(new Market(exa, auditor)), "")));
    Market(address(exaEXA)).initialize("EXA", 3, 1e18, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(exaEXA), "exaEXA");
    auditor.enableMarket(Market(address(exaEXA)), new MockPriceFeed(18, 5e18), 0.8e18);
    // usdc
    usdc = new MockERC20("USD Coin", "USDC", 6);
    vm.label(address(usdc), "USDC");
    exaUSDC = IMarket(address(new ERC1967Proxy(address(new Market(usdc, auditor)), "")));
    Market(address(exaUSDC)).initialize("USDC", 3, 1e6, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(exaUSDC), "exaUSDC");
    auditor.enableMarket(Market(address(exaUSDC)), new MockPriceFeed(18, 1e18), 0.9e18);

    IBalancerVault balancer = IBalancerVault(address(new MockBalancerVault()));
    exa.mint(address(balancer), 1_000_000e18);
    usdc.mint(address(balancer), 1_000_000e6);
    debtManager = DebtManager(
      address(
        new ERC1967Proxy(
          address(new DebtManager(auditor, IPermit2(address(0)), IBalancerVaultDM(address(balancer)))), ""
        )
      )
    );
    debtManager.initialize();
    vm.label(address(debtManager), "DebtManager");

    IVelodromeFactory velodromeFactory = IVelodromeFactory(address(0x123)); // HACK mock VelodromePoolFactory

    entryPoint = IEntryPoint(address(new EntryPoint()));
    collector = payable(makeAddr("collector"));
    (owner, ownerKey) = makeAddrAndKey("owner");
    owners = new address[](1);
    owners[0] = owner;
    (keeper, keeperKey) = makeAddrAndKey("keeper");
    (issuer, issuerKey) = makeAddrAndKey("issuer");

    issuerChecker = new IssuerChecker(issuer);

    exaPlugin = new ExaPlugin(IAuditor(address(auditor)), exaUSDC, balancer, velodromeFactory, issuerChecker, collector);
    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

    ownerPlugin = new WebauthnOwnerPlugin();
    ExaAccountFactory factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(entryPoint)), entryPoint
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
    vm.stopPrank();

    domainSeparator = issuerChecker.DOMAIN_SEPARATOR();
  }

  // solhint-disable func-name-mixedcase

  function test_collectCredit_collects() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
    assertEq(usdc.balanceOf(collector), 0);

    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    assertEq(usdc.balanceOf(collector), 100e6);
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
    uint256 timestamp = block.timestamp - exaPlugin.OPERATION_EXPIRY() - 1;
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
    uint256 timestamp = block.timestamp - exaPlugin.OPERATION_EXPIRY() - 1;
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

  function test_withdraw_transfersAsset_asOwner() external {
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
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, address(account))));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(address(account)), 0);
    vm.prank(keeper);
    account.withdraw();
    assertEq(exa.balanceOf(address(account)), amount);
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
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
        abi.encodePacked(NoProposal.selector)
      )
    );
    account.execute(address(exaEXA), 0, abi.encodeCall(IERC4626.withdraw, (amount, address(account), address(account))));
  }

  function test_withdraw_reverts_whenNoProposalKeeper() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);

    vm.expectRevert(NoProposal.selector);
    account.withdraw();
  }

  function test_withdraw_reverts_whenTimelocked() external {
    uint256 amount = 1;
    vm.startPrank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, address(account))));

    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
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
    vm.expectRevert(
      abi.encodeWithSelector(
        UpgradeableModularAccount.PreExecHookReverted.selector,
        exaPlugin,
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
        abi.encodePacked(Timelocked.selector)
      )
    );
    account.withdraw();
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
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
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
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
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
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
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
        FunctionId.RUNTIME_VALIDATION_KEEPER,
        abi.encodeWithSelector(Unauthorized.selector)
      )
    );
    account.withdraw();
  }

  function test_poke() external {
    vm.startPrank(keeper);
    account.poke(exaEXA);
  }

  function test_propose_emitsProposed() external {
    uint256 amount = 1;
    address receiver = address(0x420);

    vm.startPrank(owner);

    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit Proposed(address(account), exaEXA, receiver, amount, block.timestamp + exaPlugin.PROPOSAL_DELAY());
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));
  }

  function test_repay_repays() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    account.collectCredit(FixedLib.INTERVAL, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));
    vm.stopPrank();

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.repay, (FixedLib.INTERVAL)));
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
  }

  function test_crossRepay_repays() external {
    vm.createSelectFork("optimism", 124_672_500);
    usdc = MockERC20(protocol("USDC"));
    exa = MockERC20(protocol("WETH"));
    exaEXA = IMarket(protocol("MarketWETH"));
    exaUSDC = IMarket(protocol("MarketUSDC"));

    issuerChecker = new IssuerChecker(issuer);
    domainSeparator = issuerChecker.DOMAIN_SEPARATOR();
    exaPlugin = new ExaPlugin(
      IAuditor(protocol("Auditor")),
      exaUSDC,
      IBalancerVault(protocol("BalancerVault")),
      IVelodromeFactory(protocol("VelodromePoolFactory")),
      issuerChecker,
      collector
    );
    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

    ownerPlugin = new WebauthnOwnerPlugin();
    ExaAccountFactory factory = new ExaAccountFactory(
      address(this), ownerPlugin, exaPlugin, address(new UpgradeableModularAccount(entryPoint)), entryPoint
    );

    account = ExaAccount(payable(factory.createAccount(0, owners.toPublicKeys())));
    vm.deal(address(account), 10_000 ether);
    vm.label(address(account), "op-account");

    deal(address(usdc), address(account), 100_000e6);

    deal(address(exa), address(account), 10e18);

    uint256 maturity = block.timestamp + FixedLib.INTERVAL - (block.timestamp % FixedLib.INTERVAL);

    vm.startPrank(keeper);
    account.poke(exaEXA);
    account.collectCredit(maturity, 100e6, block.timestamp, _issuerOp(100e6, block.timestamp));

    uint256 prevCollateral = exaEXA.balanceOf(address(account));
    assertEq(usdc.balanceOf(address(exaPlugin)), 0);

    vm.startPrank(address(account));
    account.crossRepay(maturity, exaEXA);

    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    assertGt(prevCollateral, exaEXA.balanceOf(address(account)), "collateral didn't decrease");
  }

  function test_onUninstall_uninstalls() external {
    vm.startPrank(owner);
    account.uninstallPlugin(address(exaPlugin), "", "");
    address[] memory plugins = account.getInstalledPlugins();
    assertEq(plugins.length, 1);
    assertEq(plugins[0], address(ownerPlugin));
  }

  // solhint-enable func-name-mixedcase

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

  function _issuerOp(uint256 amount, uint256 timestamp) internal view returns (bytes memory signature) {
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

  function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks
}

abstract contract ExaAccount is UpgradeableModularAccount, IExaAccount { } // solhint-disable-line no-empty-blocks
