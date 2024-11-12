// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0; // solhint-disable-line one-contract-per-file

import { ForkTest, stdError } from "./Fork.t.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { FixedLib, Market } from "@exactly/protocol/Market.sol";

import { UpgradeableModularAccount } from "modular-account/src/account/UpgradeableModularAccount.sol";

import { FunctionReference } from "modular-account-libs/interfaces/IPluginManager.sol";
import { UserOperation } from "modular-account-libs/interfaces/UserOperation.sol";

import { IAccessControl } from "openzeppelin-contracts/contracts/access/IAccessControl.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import { Address } from "openzeppelin-contracts/contracts/utils/Address.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { LibString } from "solady/utils/LibString.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";

import {
  ExaPlugin, FunctionId, IBalancerVault, IDebtManager, IInstallmentsRouter, ZeroAddress
} from "../src/ExaPlugin.sol";
import {
  CollectorSet,
  Expired,
  FixedPosition,
  IAuditor,
  IExaAccount,
  IMarket,
  InsufficientLiquidity,
  KeeperFeeModelSet,
  NoProposal,
  Proposed,
  Timelocked,
  Unauthorized,
  WrongValue
} from "../src/IExaAccount.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { KeeperFeeModel } from "../src/KeeperFeeModel.sol";
import { Refunder } from "../src/Refunder.sol";

import { DeployIssuerChecker } from "../script/IssuerChecker.s.sol";
import { DeployKeeperFeeModel } from "../script/KeeperFeeModel.s.sol";
import { DeployRefunder } from "../script/Refunder.s.sol";

import { DeployAccount, ENTRYPOINT } from "./mocks/Account.s.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

// solhint-disable-next-line max-states-count
contract ExaPluginTest is ForkTest {
  using FixedPointMathLib for uint256;
  using OwnersLib for address[];
  using LibString for address;
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
  KeeperFeeModel internal keeperFeeModel;
  bytes32 internal domainSeparator;
  Refunder internal refunder;

  Auditor internal auditor;
  IMarket internal exaEXA;
  IMarket internal exaUSDC;
  IMarket internal exaWETH;
  MockERC20 internal exa;
  MockERC20 internal usdc;

  function setUp() external {
    vm.setEnv("DEPLOYER_ADDRESS", address(this).toHexString());

    collector = payable(makeAddr("collector"));
    (owner, ownerKey) = makeAddrAndKey("owner");
    owners = new address[](1);
    owners[0] = owner;
    (keeper, keeperKey) = makeAddrAndKey("keeper");
    (issuer, issuerKey) = makeAddrAndKey("issuer");
    vm.setEnv("KEEPER_ADDRESS", keeper.toHexString());
    vm.setEnv("ISSUER_ADDRESS", issuer.toHexString());

    new DeployAccount().run();
    DeployProtocol p = new DeployProtocol();
    p.run();

    auditor = p.auditor();
    exaEXA = IMarket(address(p.exaEXA()));
    exaUSDC = IMarket(address(p.exaUSDC()));
    exaWETH = IMarket(address(p.exaWETH()));
    exa = p.exa();
    usdc = p.usdc();
    vm.setEnv("PROTOCOL_MARKETUSDC_ADDRESS", address(exaUSDC).toHexString());

    DeployIssuerChecker ic = new DeployIssuerChecker();
    ic.run();
    issuerChecker = ic.issuerChecker();
    vm.setEnv("BROADCAST_ISSUERCHECKER_ADDRESS", address(issuerChecker).toHexString());

    DeployKeeperFeeModel kfm = new DeployKeeperFeeModel();
    kfm.run();
    keeperFeeModel = kfm.keeperFeeModel();
    vm.setEnv("BROADCAST_KEEPERFEEMODEL_ADDRESS", address(keeperFeeModel).toHexString());

    DeployRefunder r = new DeployRefunder();
    r.setUp();
    r.run();
    refunder = r.refunder();
    vm.setEnv("BROADCAST_REFUNDER_ADDRESS", address(refunder).toHexString());

    refunder.grantRole(refunder.KEEPER_ROLE(), keeper);
    exaPlugin = new ExaPlugin(
      IAuditor(address(auditor)),
      exaUSDC,
      exaWETH,
      p.balancer(),
      IDebtManager(address(p.debtManager())),
      IInstallmentsRouter(address(p.installmentsRouter())),
      issuerChecker,
      collector,
      keeperFeeModel
    );
    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper);

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

  function test_collectCredit_reverts_whenPrposalCausesInsufficientLiquidity() external {
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

  function test_collectCredit_collects_whenHealthFactorHigherThanMinCreditFactor() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 credit = exaUSDCBalance / 2;

    account.collectCredit(FixedLib.INTERVAL, credit, block.timestamp, _issuerOp(credit, block.timestamp));

    assertEq(usdc.balanceOf(collector), credit);
  }

  function test_collectCredit_reverts_whenHealthFactorLowerThanMinCreditFactor() external {
    exaPlugin.setMinCreditFactor(2e18);

    vm.startPrank(keeper);
    account.poke(exaUSDC);

    uint256 exaUSDCBalance = exaUSDC.balanceOf(address(account));
    uint256 credit = exaUSDCBalance / 2;

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
    uint256 timestamp = block.timestamp - exaPlugin.OPERATION_EXPIRY() - 1;
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
    address receiver = address(0x420);
    vm.prank(keeper);
    account.poke(exaEXA);

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaEXA, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(exa.balanceOf(receiver), 0);
    vm.prank(keeper);
    account.withdraw();
    assertEq(exa.balanceOf(receiver), amount);
  }

  function test_withdrawWETH_transfersETH() external {
    uint256 amount = 100 ether;
    address receiver = address(0x420);
    vm.prank(keeper);
    account.pokeETH();

    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.propose, (exaWETH, amount, receiver)));

    skip(exaPlugin.PROPOSAL_DELAY());

    assertEq(receiver.balance, 0);
    vm.prank(keeper);
    account.withdraw();
    assertEq(receiver.balance, amount);
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
        FunctionId.PRE_EXEC_VALIDATION_PROPOSED,
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

  function test_pokeETH_deposits() external {
    uint256 balance = address(account).balance;

    vm.startPrank(keeper);
    account.pokeETH();

    assertEq(address(account).balance, 0, "ETH unwrapped");
    assertEq(exaWETH.maxWithdraw(address(account)), balance, "WETH left");
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

  function test_repay_partiallyRepays() external {
    vm.startPrank(keeper);
    account.poke(exaUSDC);
    account.poke(exaEXA);
    account.collectCredit(FixedLib.INTERVAL, 100_000e6 + 1, block.timestamp, _issuerOp(100_000e6 + 1, block.timestamp));
    vm.stopPrank();

    assertEq(exaUSDC.maxWithdraw(address(account)), 100_000e6);
    vm.prank(owner);
    account.execute(address(account), 0, abi.encodeCall(IExaAccount.repay, (FixedLib.INTERVAL)));
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
  }

  function test_crossRepay_lifi() external {
    vm.createSelectFork("optimism", 127_050_624);
    account = ExaAccount(payable(0x6120Fb2A9d47f7955298b80363F00C620dB9f6E6));
    uint256 amount = 0.0004e8;

    vm.setEnv("DEPLOYER_ADDRESS", "");
    vm.setEnv("KEEPER_ADDRESS", "");
    vm.setEnv("ISSUER_ADDRESS", "");
    vm.setEnv("PROTOCOL_MARKETUSDC_ADDRESS", "");
    vm.setEnv("BROADCAST_ISSUERCHECKER_ADDRESS", "");
    vm.setEnv("BROADCAST_REFUNDER_ADDRESS", "");

    exaPlugin = new ExaPlugin(
      IAuditor(protocol("Auditor")),
      IMarket(protocol("MarketUSDC")),
      IMarket(protocol("MarketWETH")),
      IBalancerVault(protocol("BalancerVault")),
      IDebtManager(protocol("DebtManager")),
      IInstallmentsRouter(protocol("InstallmentsRouter")),
      IssuerChecker(broadcast("IssuerChecker")),
      acct("collector"),
      KeeperFeeModel(broadcast("KeeperFeeModel"))
    );

    IMarket exaWBTC = IMarket(protocol("MarketWBTC"));
    deal(address(exaWBTC), address(account), amount);
    usdc = MockERC20(protocol("USDC"));

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

    uint256 maturity = block.timestamp + 2 * FixedLib.INTERVAL - (block.timestamp % FixedLib.INTERVAL);

    bytes memory route = bytes.concat(
      hex"4666fc80b7c64668375a12ff485d0a88dee3ac5d82d77587a6be542b9233c5eb13830c4c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000",
      abi.encodePacked(address(exaPlugin)),
      hex"00000000000000000000000000000000000000000000000000000000018f7705000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000034578610000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000111111125421ca6dc452d289314280a0f8842a65000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000004e807ed2379000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000068f180fcce6836688e9084f035309e29bf0a20950000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000009c4000000000000000000000000000000000000000000000000000000000018f770400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000039600000000000000000000000000000000000000000000000000000000037800a007e5c0d20000000000000000000000000000000000000000000000000003540000f051204c4af8dbc524681930a27b2f1af5bcc8062e6fb768f180fcce6836688e9084f035309e29bf0a209500447dc2038200000000000000000000000068f180fcce6836688e9084f035309e29bf0a209500000000000000000000000042000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002495763e3d93b6000000000000000000000000b63aae6c353636d66df13b89ba4425cfe13d10ba00000000000000000000000042f527f50f16a103b6ccab48bccca214500c102100a0c9e75c480000000000000013130c0000000000000000000000000000000000000000000002360001d300006302a000000000000000000000000000000000000000000000000000000000005f6305ee63c1e580c1738d90e2e26c35784a0d3e3d8a9f795074bca44200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a655106a062ae8a9c5e11aaa026fc2670b0d65ccc8b285842000000000000000000000000000000000000060004cac88ea9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009708bd00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000111111125421ca6dc452d289314280a0f8842a6500000000000000000000000000000000000000000000000000000000671fb839000000000000000000000000000000000000000000000000000000000000000100000000000000000000000042000000000000000000000000000000000000060000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff850000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1046053aa5682b4f9a81b5481394da16be5ff5a02a0000000000000000000000000000000000000000000000000000000000097095eee63c1e580d4cb5566b5c16ef2f4a08b1438052013171212a24200000000000000000000000000000000000006111111125421ca6dc452d289314280a0f8842a65000000000000000000002a94d114000000000000000000000000000000000000000000000000"
    );
    uint256 prevCollateral = exaWBTC.balanceOf(address(account));

    account.crossRepay(maturity, 21e6, 25e6, exaWBTC, amount, route);
    vm.stopPrank();
    assertEq(usdc.balanceOf(address(exaPlugin)), 0, "usdc dust");
    assertGt(prevCollateral, exaWBTC.balanceOf(address(account)), "collateral didn't decrease");
  }

  function test_rollDebt_rolls() external {
    vm.startPrank(keeper);

    account.poke(exaUSDC);
    uint256 assets = 100e6;
    uint256 maxAssets = 110e6;
    account.collectCredit(FixedLib.INTERVAL, assets, maxAssets, block.timestamp, _issuerOp(assets, block.timestamp));

    account.rollDebt(FixedLib.INTERVAL, FixedLib.INTERVAL * 2, maxAssets, maxAssets, 100e18);

    FixedPosition memory position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL, address(account));
    assertEq(position.principal, 0);
    assertEq(position.fee, 0);
    position = exaUSDC.fixedBorrowPositions(FixedLib.INTERVAL * 2, address(account));
    assertGt(position.principal, assets);
    assertGt(position.fee, 0);
    assertLe(position.principal, maxAssets);
  }

  function test_onUninstall_uninstalls() external {
    vm.startPrank(owner);
    account.uninstallPlugin(address(exaPlugin), "", "");
    address[] memory plugins = account.getInstalledPlugins();
    assertEq(plugins.length, 1);
    assertEq(plugins[0], address(ownerPlugin));
  }

  function test_refund_refunds() external {
    vm.startPrank(keeper);

    uint256 balance = exaUSDC.balanceOf(address(account));
    deal(address(usdc), address(refunder), 100e6);
    refunder.refund(address(account), 100e6, block.timestamp + 1, _issuerOp(100e6, block.timestamp + 1));
    assertEq(exaUSDC.balanceOf(address(account)), balance + 100e6);
  }

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

  function test_setKeeperFeeModel_sets_whenAdmin() external {
    exaPlugin.setKeeperFeeModel(KeeperFeeModel(address(0xb0b)));
    assertEq(address(exaPlugin.keeperFeeModel()), address(0xb0b));
  }

  function test_setKeeperFeeModel_reverts_whenNotAdmin() external {
    address nonAdmin = address(0x1);
    vm.startPrank(nonAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, nonAdmin, exaPlugin.DEFAULT_ADMIN_ROLE()
      )
    );

    exaPlugin.setKeeperFeeModel(KeeperFeeModel(address(0xb0b)));
  }

  function test_setKeeperFeeModel_emitsKeeperFeeModelSet() external {
    KeeperFeeModel newKeeperFeeModel = KeeperFeeModel(address(0x1));
    vm.expectEmit(true, true, true, true, address(exaPlugin));
    emit KeeperFeeModelSet(address(newKeeperFeeModel), address(this));
    exaPlugin.setKeeperFeeModel(newKeeperFeeModel);
  }

  function test_setKeeperFeeModel_reverts_whenAddressZero() external {
    vm.expectRevert(ZeroAddress.selector);
    exaPlugin.setKeeperFeeModel(KeeperFeeModel(address(0)));
  }

  function test_setMinCreditFactor_sets_whenAdmin() external {
    exaPlugin.setMinCreditFactor(2e18);
    assertEq(exaPlugin.minCreditFactor(), 2e18);
  }

  function test_setMinCreditFactor_reverts_whenNotAdmin() external {
    address nonAdmin = address(0x1);
    vm.startPrank(nonAdmin);
    vm.expectRevert(
      abi.encodeWithSelector(
        IAccessControl.AccessControlUnauthorizedAccount.selector, nonAdmin, exaPlugin.DEFAULT_ADMIN_ROLE()
      )
    );
    exaPlugin.setMinCreditFactor(2e18);
  }

  function test_setMinCreditFactor_reverts_whenLowerThanWad() external {
    vm.expectRevert(WrongValue.selector);
    exaPlugin.setMinCreditFactor(1e18 - 1);
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
    op.signature = _sign(privateKey, ENTRYPOINT.getUserOpHash(op).toEthSignedMessageHash());
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

error Disagreement();
