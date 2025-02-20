// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "openzeppelin-contracts/contracts/utils/Address.sol";

import {
  ManifestAssociatedFunction,
  ManifestAssociatedFunctionType,
  ManifestExecutionHook,
  ManifestFunction,
  PluginManifest,
  PluginMetadata
} from "modular-account-libs/interfaces/IPlugin.sol";
import { IPluginExecutor } from "modular-account-libs/interfaces/IPluginExecutor.sol";
import { Call, IStandardExecutor } from "modular-account-libs/interfaces/IStandardExecutor.sol";
import { BasePlugin } from "modular-account-libs/plugins/BasePlugin.sol";

import { WETH as IWETH } from "solady/tokens/WETH.sol";
import { ECDSA } from "solady/utils/ECDSA.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { LibBytes } from "solady/utils/LibBytes.sol";
import { ReentrancyGuard } from "solady/utils/ReentrancyGuard.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";
import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";

import {
  BorrowAtMaturityData,
  CollectorSet,
  CrossRepayData,
  Disagreement,
  IAuditor,
  IDebtManager,
  IExaAccount,
  IInstallmentsRouter,
  IMarket,
  IProposalManager,
  NoBalance,
  NoProposal,
  NotMarket,
  Proposal,
  ProposalManagerSet,
  ProposalNonceSet,
  ProposalType,
  Proposed,
  RepayData,
  RollDebtData,
  SwapData,
  Timelocked,
  Unauthorized,
  UninstallProposed,
  UninstallRevoked,
  Uninstalling,
  ZeroAddress
} from "./IExaAccount.sol";
import { IssuerChecker } from "./IssuerChecker.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin, IExaAccount, ReentrancyGuard {
  using FixedPointMathLib for uint256;
  using SafeTransferLib for address;
  using SafeCastLib for int256;
  using SafeERC20 for IERC20;
  using Address for address;
  using LibBytes for bytes;
  using ECDSA for bytes32;

  string public constant NAME = "Exa Plugin";
  string public constant VERSION = "0.0.3";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  IERC20 public immutable USDC;
  IWETH public immutable WETH;
  address public immutable SWAPPER;
  IAuditor public immutable AUDITOR;
  IMarket public immutable EXA_USDC;
  IMarket public immutable EXA_WETH;
  IBalancerVault public immutable BALANCER_VAULT;
  IDebtManager public immutable DEBT_MANAGER;
  IInstallmentsRouter public immutable INSTALLMENTS_ROUTER;
  IssuerChecker public immutable ISSUER_CHECKER;
  uint256 public immutable PROPOSAL_DELAY = 1 minutes;

  IProposalManager public proposalManager;
  address public collector;
  mapping(address account => uint256 timestamp) public uninstallProposals;

  bytes32 private callHash;

  constructor(Parameters memory p) {
    USDC = IERC20(p.exaUSDC.asset());
    WETH = IWETH(payable(p.exaWETH.asset()));
    AUDITOR = p.auditor;
    EXA_USDC = p.exaUSDC;
    EXA_WETH = p.exaWETH;
    BALANCER_VAULT = p.balancerVault;
    DEBT_MANAGER = p.debtManager;
    INSTALLMENTS_ROUTER = p.installmentsRouter;
    ISSUER_CHECKER = p.issuerChecker;
    if (p.swapper == address(0)) revert ZeroAddress();
    SWAPPER = p.swapper;

    _grantRole(KEEPER_ROLE, p.firstKeeper);
    _grantRole(DEFAULT_ADMIN_ROLE, p.owner);
    _setCollector(p.collector);
    _setProposalManager(p.proposalManager);

    IERC20(USDC).forceApprove(address(EXA_USDC), type(uint256).max);
  }

  function proposeUninstall() external {
    uninstallProposals[msg.sender] = block.timestamp;
    emit UninstallProposed(msg.sender, block.timestamp + PROPOSAL_DELAY);
  }

  function revokeUninstall() external {
    delete uninstallProposals[msg.sender];
    emit UninstallRevoked(msg.sender);
  }

  function swap(IERC20 assetIn, IERC20 assetOut, uint256 maxAmountIn, uint256 minAmountOut, bytes memory route)
    public
    returns (uint256 amountIn, uint256 amountOut)
  {
    if (_isMarket(IMarket(address(assetIn)))) revert Unauthorized();

    uint256 balanceIn = assetIn.balanceOf(msg.sender);
    uint256 balanceOut = assetOut.balanceOf(msg.sender);

    _approveAndExecuteFromSender(SWAPPER, address(assetIn), maxAmountIn, route);

    amountOut = assetOut.balanceOf(msg.sender) - balanceOut;
    if (amountOut < minAmountOut) revert Disagreement();

    _approveFromSender(address(assetIn), SWAPPER, 0);
    amountIn = balanceIn - assetIn.balanceOf(msg.sender);
  }

  function executeProposal() external {
    Proposal memory proposal = proposalManager.nextProposal(msg.sender);

    if (proposal.amount == 0) revert NoProposal();

    if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();

    if (proposal.proposalType == ProposalType.WITHDRAW) {
      address receiver = abi.decode(proposal.data, (address));
      bool isWETH = proposal.market == EXA_WETH;
      _executeFromSender(
        address(proposal.market),
        0,
        abi.encodeCall(IERC4626.withdraw, (proposal.amount, isWETH ? address(this) : receiver, msg.sender))
      );
      if (isWETH) {
        WETH.withdraw(proposal.amount);
        receiver.safeTransferETH(proposal.amount);
      }
    } else if (proposal.proposalType == ProposalType.SWAP) {
      _executeFromSender(
        address(proposal.market), 0, abi.encodeCall(IERC4626.withdraw, (proposal.amount, msg.sender, msg.sender))
      );
      SwapData memory data = abi.decode(proposal.data, (SwapData));
      swap(IERC20(proposal.market.asset()), data.assetOut, proposal.amount, data.minAmountOut, data.route);
    } else if (proposal.proposalType == ProposalType.BORROW_AT_MATURITY) {
      BorrowAtMaturityData memory borrowData = abi.decode(proposal.data, (BorrowAtMaturityData));
      _executeFromSender(
        address(EXA_USDC),
        0,
        abi.encodeCall(
          IMarket.borrowAtMaturity,
          (borrowData.maturity, proposal.amount, borrowData.maxAssets, borrowData.receiver, msg.sender)
        )
      );
    } else if (proposal.proposalType == ProposalType.CROSS_REPAY) {
      CrossRepayData memory crossData = abi.decode(proposal.data, (CrossRepayData));
      bytes memory data = _hash(
        abi.encodePacked(
          bytes1(0x02),
          abi.encode(
            CrossRepayCallbackData({
              maturity: crossData.maturity,
              borrower: msg.sender,
              positionAssets: crossData.positionAssets,
              maxRepay: crossData.maxRepay,
              marketIn: proposal.market,
              maxAmountIn: proposal.amount,
              route: crossData.route
            })
          )
        )
      );
      _approveFromSender(address(proposal.market), address(this), proposal.amount);
      _flashLoan(crossData.maxRepay, data);
    } else if (proposal.proposalType == ProposalType.ROLL_DEBT) {
      RollDebtData memory rollData = abi.decode(proposal.data, (RollDebtData));
      _approveAndExecuteFromSender(
        address(DEBT_MANAGER),
        address(EXA_USDC),
        rollData.maxRepayAssets,
        abi.encodeCall(
          IDebtManager.rollFixed,
          (
            EXA_USDC,
            rollData.repayMaturity,
            rollData.borrowMaturity,
            rollData.maxRepayAssets,
            proposal.amount,
            rollData.percentage
          )
        )
      );
      _approveFromSender(address(EXA_USDC), address(DEBT_MANAGER), 0);
    } else if (proposal.proposalType == ProposalType.REPAY) {
      RepayData memory repayData = abi.decode(proposal.data, (RepayData));
      bytes memory data = _hash(
        abi.encodePacked(
          bytes1(0x01),
          abi.encode(
            RepayCallbackData({
              maturity: repayData.maturity,
              borrower: msg.sender,
              positionAssets: proposal.amount,
              maxRepay: repayData.maxRepay
            })
          )
        )
      );
      _approveFromSender(address(EXA_USDC), address(this), EXA_USDC.previewWithdraw(repayData.maxRepay));
      _flashLoan(repayData.maxRepay, data);
    }
  }

  function propose(IMarket market, uint256 amount, ProposalType proposalType, bytes memory data) external {
    uint256 nonce = proposalManager.propose(msg.sender, market, amount, proposalType, data);
    emit Proposed(msg.sender, nonce, market, proposalType, amount, data, block.timestamp + PROPOSAL_DELAY);
  }

  function setProposalNonce(uint256 nonce) external {
    emit ProposalNonceSet(msg.sender, nonce);
    proposalManager.setNonce(msg.sender, nonce);
  }

  function collectCollateral(
    uint256 amount,
    IMarket collateral,
    uint256 maxAmountIn,
    uint256 timestamp,
    bytes calldata route,
    bytes calldata signature
  ) external returns (uint256 amountIn, uint256 amountOut) {
    _checkIssuer(msg.sender, amount, timestamp, signature);
    _checkMarket(collateral);

    _executeFromSender(
      address(collateral), 0, abi.encodeCall(IERC4626.withdraw, (maxAmountIn, address(this), msg.sender))
    );
    (amountIn, amountOut) = _swap(IERC20(collateral.asset()), IERC20(USDC), maxAmountIn, amount, route);
    IERC20(USDC).safeTransfer(collector, amount);

    _depositUnspent(collateral, maxAmountIn - amountIn, msg.sender);
    _depositApprovedUnspent(amountOut - amount, msg.sender);
    _executeFromSender(address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (EXA_USDC)));

    _checkLiquidity(msg.sender);
  }

  function collectCredit(uint256 maturity, uint256 amount, uint256 timestamp, bytes calldata signature) external {
    collectCredit(maturity, amount, type(uint256).max, timestamp, signature);
  }

  function collectCredit(
    uint256 maturity,
    uint256 amount,
    uint256 maxRepay,
    uint256 timestamp,
    bytes calldata signature
  ) public {
    _checkIssuer(msg.sender, amount, timestamp, signature);

    _executeFromSender(
      address(EXA_USDC),
      0,
      abi.encodeCall(IMarket.borrowAtMaturity, (maturity, amount, maxRepay, collector, msg.sender))
    );
    _checkLiquidity(msg.sender);
  }

  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature) external {
    _checkIssuer(msg.sender, amount, timestamp, signature);
    _executeFromSender(address(EXA_USDC), 0, abi.encodeCall(IERC4626.withdraw, (amount, collector, msg.sender)));
    _checkLiquidity(msg.sender);
  }

  function collectInstallments(
    uint256 firstMaturity,
    uint256[] calldata amounts,
    uint256 maxRepay,
    uint256 timestamp,
    bytes calldata signature
  ) external {
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < amounts.length; ++i) {
      totalAmount += amounts[i];
    }
    _checkIssuer(msg.sender, totalAmount, timestamp, signature);

    _approveAndExecuteFromSender(
      address(INSTALLMENTS_ROUTER),
      address(EXA_USDC),
      maxRepay,
      abi.encodeCall(IInstallmentsRouter.borrow, (EXA_USDC, firstMaturity, amounts, maxRepay, collector))
    );
    _checkLiquidity(msg.sender);
    _approveFromSender(address(EXA_USDC), address(INSTALLMENTS_ROUTER), 0);
  }

  function poke(IMarket market) external {
    _checkMarket(market);
    _poke(market);
  }

  function pokeETH() external {
    _executeFromSender(address(WETH), msg.sender.balance, abi.encodeCall(IWETH.deposit, ()));
    _poke(EXA_WETH);
  }

  function receiveFlashLoan(IERC20[] calldata, uint256[] calldata, uint256[] calldata, bytes calldata data) external {
    // slither-disable-next-line incorrect-equality -- hash comparison
    assert(msg.sender == address(BALANCER_VAULT) && callHash == keccak256(data));
    delete callHash;

    uint256 maturity;
    uint256 positionAssets;
    uint256 maxRepay;
    address borrower;
    uint256 actualRepay;

    if (data[0] == 0x01) {
      RepayCallbackData memory r = abi.decode(data[1:], (RepayCallbackData));
      (maturity, positionAssets, maxRepay, borrower) = (r.maturity, r.positionAssets, r.maxRepay, r.borrower);
    } else {
      CrossRepayCallbackData memory c = abi.decode(data[1:], (CrossRepayCallbackData));
      (maturity, positionAssets, maxRepay, borrower) = (c.maturity, c.positionAssets, c.maxRepay, c.borrower);
    }

    actualRepay = EXA_USDC.repayAtMaturity(maturity, positionAssets, maxRepay, borrower);

    if (data[0] == 0x01) {
      if (actualRepay < maxRepay) EXA_USDC.deposit(maxRepay - actualRepay, borrower);
      EXA_USDC.withdraw(maxRepay, address(BALANCER_VAULT), borrower);
    } else {
      CrossRepayCallbackData memory c = abi.decode(data[1:], (CrossRepayCallbackData));
      c.marketIn.withdraw(c.maxAmountIn, address(this), borrower);
      (uint256 amountIn, uint256 amountOut) =
        _swap(IERC20(c.marketIn.asset()), IERC20(USDC), c.maxAmountIn, maxRepay, c.route);
      IERC20(USDC).safeTransfer(address(BALANCER_VAULT), maxRepay);

      _depositUnspent(c.marketIn, c.maxAmountIn - amountIn, borrower);
      _depositApprovedUnspent(amountOut - actualRepay, borrower);
    }
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks

  function setCollector(address collector_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setCollector(collector_);
  }

  function setProposalManager(IProposalManager proposalManager_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setProposalManager(proposalManager_);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function onUninstall(bytes calldata) external override {
    if (uninstallProposals[msg.sender] + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
    uninstallProposals[msg.sender] = 0;
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](13);
    manifest.executionFunctions[0] = this.proposeUninstall.selector;
    manifest.executionFunctions[1] = this.revokeUninstall.selector;
    manifest.executionFunctions[2] = this.swap.selector;
    manifest.executionFunctions[3] = this.executeProposal.selector;
    manifest.executionFunctions[4] = this.propose.selector;
    manifest.executionFunctions[5] = this.setProposalNonce.selector;
    manifest.executionFunctions[6] = this.collectCollateral.selector;
    manifest.executionFunctions[7] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[8] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[9] = this.collectDebit.selector;
    manifest.executionFunctions[10] = this.collectInstallments.selector;
    manifest.executionFunctions[11] = this.poke.selector;
    manifest.executionFunctions[12] = this.pokeETH.selector;

    ManifestFunction memory selfRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_SELF),
      dependencyIndex: 0
    });
    ManifestFunction memory keeperRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_KEEPER),
      dependencyIndex: 0
    });
    ManifestFunction memory keeperOrSelfRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_KEEPER_OR_SELF),
      dependencyIndex: 0
    });
    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](13);

    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.proposeUninstall.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.revokeUninstall.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.swap.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.executeProposal.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.propose.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.setProposalNonce.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[6] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectCollateral.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[7] = ManifestAssociatedFunction({
      executionSelector: bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)")),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[8] = ManifestAssociatedFunction({
      executionSelector: bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)")),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[9] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectDebit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[10] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectInstallments.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[11] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.poke.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[12] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.pokeETH.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });

    ManifestFunction memory preExecutionValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.PRE_EXEC_VALIDATION),
      dependencyIndex: 0
    });
    manifest.executionHooks = new ManifestExecutionHook[](3);
    manifest.executionHooks[0] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.execute.selector,
      preExecHook: preExecutionValidationFunction,
      postExecHook: preExecutionValidationFunction
    });
    manifest.executionHooks[1] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.executeBatch.selector,
      preExecHook: preExecutionValidationFunction,
      postExecHook: preExecutionValidationFunction
    });
    manifest.executionHooks[2] = ManifestExecutionHook({
      executionSelector: IPluginExecutor.executeFromPluginExternal.selector,
      preExecHook: preExecutionValidationFunction,
      postExecHook: preExecutionValidationFunction
    });

    ManifestFunction memory alwaysDeny = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.PRE_HOOK_ALWAYS_DENY,
      functionId: 0,
      dependencyIndex: 0
    });
    manifest.preUserOpValidationHooks = new ManifestAssociatedFunction[](manifest.executionFunctions.length);
    for (uint256 i = 0; i < manifest.executionFunctions.length; ++i) {
      manifest.preUserOpValidationHooks[i] = ManifestAssociatedFunction({
        executionSelector: manifest.executionFunctions[i],
        associatedFunction: alwaysDeny
      });
    }

    manifest.permitAnyExternalAddress = true;
    manifest.canSpendNativeToken = true;

    return manifest;
  }

  /// @inheritdoc BasePlugin
  function pluginMetadata() external pure virtual override returns (PluginMetadata memory metadata) {
    metadata.name = NAME;
    metadata.version = VERSION;
    metadata.author = AUTHOR;
  }

  /// @inheritdoc BasePlugin
  function postExecutionHook(uint8 functionId, bytes calldata preExecHookData) external override {
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION)) {
      if (preExecHookData.length == 0) return;
      uint256 nonce = abi.decode(preExecHookData, (uint256));
      proposalManager.setNonce(msg.sender, nonce);
      emit ProposalNonceSet(msg.sender, nonce);
      return;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function preExecutionHook(uint8 functionId, address, uint256, bytes calldata callData)
    external
    view
    override
    returns (bytes memory)
  {
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION)) {
      bool isExecuteBatch = bytes4(callData[0:4]) == IStandardExecutor.executeBatch.selector;
      uint256 nonce;
      uint256 newNonce;
      if (isExecuteBatch) {
        nonce = proposalManager.nonces(msg.sender);
        newNonce = nonce;
        Call[] memory calls = abi.decode(callData[4:], (Call[]));
        for (uint256 i = 0; i < calls.length; i++) {
          Call memory call = calls[i];
          if (call.target == msg.sender) continue;
          newNonce = _preExecutionChecker(
            call.target, newNonce, bytes4(call.data.slice(0, 4)), call.data.slice(4, callData.length)
          );
        }
      } else {
        address target = address(bytes20(callData[16:36]));
        if (target == msg.sender) return "";
        nonce = proposalManager.nonces(msg.sender);
        newNonce = _preExecutionChecker(target, nonce, bytes4(callData[132:136]), callData[136:]);
      }
      return nonce != newNonce ? abi.encode(newNonce) : bytes("");
    }
    revert NotImplemented(msg.sig, functionId);
  }

  function _preExecutionChecker(address target, uint256 nonce, bytes4 selector, bytes memory callData)
    internal
    view
    returns (uint256)
  {
    return proposalManager.preExecutionChecker(msg.sender, nonce, target, selector, callData);
  }

  /// @inheritdoc BasePlugin
  function runtimeValidationFunction(uint8 functionId, address sender, uint256, bytes calldata) external view override {
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_SELF)) {
      if (msg.sender != sender) revert Unauthorized();
      return;
    }
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_KEEPER)) {
      if (!hasRole(KEEPER_ROLE, sender)) revert Unauthorized();
      return;
    }
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_KEEPER_OR_SELF)) {
      if (hasRole(KEEPER_ROLE, sender) || msg.sender == sender) return;
      revert Unauthorized();
    }
    revert NotImplemented(msg.sig, functionId);
  }

  function _approveAndExecuteFromSender(address target, address asset, uint256 amount, bytes memory data) internal {
    _approveFromSender(asset, target, amount);
    _executeFromSender(target, 0, data);
  }

  function _approveFromSender(address asset, address spender, uint256 amount) internal {
    _executeFromSender(asset, 0, abi.encodeCall(IERC20.approve, (spender, amount)));
  }

  function _checkIssuer(address issuer, uint256 amount, uint256 timestamp, bytes calldata signature) internal {
    ISSUER_CHECKER.checkIssuer(issuer, amount, timestamp, signature);
  }

  function _checkLiquidity(address account) internal view {
    if (uninstallProposals[account] != 0) revert Uninstalling();
    proposalManager.checkLiquidity(account);
  }

  function _checkMarket(IMarket market) internal view {
    if (!_isMarket(market)) revert NotMarket();
  }

  function _executeFromSender(address target, uint256 value, bytes memory data) internal {
    IPluginExecutor(msg.sender).executeFromPluginExternal(target, value, data);
  }

  function _flashLoan(uint256 amount, bytes memory data) internal {
    IERC20[] memory tokens = new IERC20[](1);
    tokens[0] = IERC20(USDC);
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;

    BALANCER_VAULT.flashLoan(address(this), tokens, amounts, data);
  }

  function _depositApprovedUnspent(uint256 unspent, address receiver) internal {
    if (unspent != 0) EXA_USDC.deposit(unspent, receiver);
  }

  function _depositUnspent(IMarket market, uint256 unspent, address receiver) internal {
    if (unspent != 0) {
      IERC20(market.asset()).forceApprove(address(market), unspent);
      market.deposit(unspent, receiver);
    }
  }

  function _hash(bytes memory data) internal returns (bytes memory) {
    callHash = keccak256(data);
    return data;
  }

  function _isMarket(IMarket market) internal view returns (bool) {
    return AUDITOR.markets(market).isListed;
  }

  function _poke(IMarket market) internal {
    uint256 balance = IERC20(market.asset()).balanceOf(msg.sender);
    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (balance == 0) revert NoBalance();

    _approveAndExecuteFromSender(
      address(market), market.asset(), balance, abi.encodeCall(IERC4626.deposit, (balance, msg.sender))
    );
    _executeFromSender(address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market)));
  }

  function _setCollector(address collector_) internal {
    if (collector_ == address(0)) revert ZeroAddress();
    collector = collector_;
    emit CollectorSet(collector_, msg.sender);
  }

  function _setProposalManager(IProposalManager proposalManager_) internal {
    if (address(proposalManager_) == address(0)) revert ZeroAddress();
    proposalManager = proposalManager_;
    emit ProposalManagerSet(proposalManager_, msg.sender);
  }

  function _swap(IERC20 assetIn, IERC20 assetOut, uint256 maxAmountIn, uint256 minAmountOut, bytes memory route)
    internal
    nonReentrant
    returns (uint256 amountIn, uint256 amountOut)
  {
    uint256 balanceIn = assetIn.balanceOf(address(this));
    uint256 balanceOut = assetOut.balanceOf(address(this));

    assetIn.forceApprove(SWAPPER, maxAmountIn);
    SWAPPER.functionCall(route);

    amountOut = assetOut.balanceOf(address(this)) - balanceOut;
    if (minAmountOut > amountOut) revert Disagreement();

    assetIn.forceApprove(SWAPPER, 0);
    amountIn = balanceIn - assetIn.balanceOf(address(this));
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return interfaceId == type(IExaAccount).interfaceId || super.supportsInterface(interfaceId);
  }
}

enum FunctionId {
  RUNTIME_VALIDATION_SELF,
  RUNTIME_VALIDATION_KEEPER,
  RUNTIME_VALIDATION_KEEPER_OR_SELF,
  PRE_EXEC_VALIDATION
}

interface IBalancerVault {
  function flashLoan(address recipient, IERC20[] memory tokens, uint256[] memory amounts, bytes memory data) external;
}

struct CrossRepayCallbackData {
  uint256 maturity;
  address borrower;
  uint256 positionAssets;
  uint256 maxRepay;
  IMarket marketIn;
  uint256 maxAmountIn;
  bytes route;
}

struct RepayCallbackData {
  uint256 maturity;
  address borrower;
  uint256 positionAssets;
  uint256 maxRepay;
}

struct Parameters {
  address owner;
  IAuditor auditor;
  IMarket exaUSDC;
  IMarket exaWETH;
  IBalancerVault balancerVault;
  IDebtManager debtManager;
  IInstallmentsRouter installmentsRouter;
  IssuerChecker issuerChecker;
  IProposalManager proposalManager;
  address collector;
  address swapper;
  address firstKeeper;
}
