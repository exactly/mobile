// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "openzeppelin-contracts/contracts/utils/Address.sol";
import { Math } from "openzeppelin-contracts/contracts/utils/math/Math.sol";

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
  AllowedTargetSet,
  CollectorSet,
  Disagreement,
  FixedPool,
  FixedPosition,
  IAuditor,
  IExaAccount,
  IMarket,
  InsufficientLiquidity,
  MarketData,
  NoBalance,
  NoProposal,
  NotMarket,
  Proposal,
  ProposalType,
  Proposed,
  SwapProposed,
  Timelocked,
  Unauthorized,
  UninstallProposed,
  UninstallRevoked,
  Uninstalling,
  WrongValue
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

  address public collector;
  mapping(address account => Proposal lastProposal) public proposals;
  mapping(address account => uint256 timestamp) public uninstallProposals;
  mapping(address target => bool allowed) public allowlist;

  bytes32 private callHash;

  constructor(
    address owner,
    IAuditor auditor,
    IMarket exaUSDC,
    IMarket exaWETH,
    IBalancerVault balancerVault,
    IDebtManager debtManager,
    IInstallmentsRouter installmentsRouter,
    IssuerChecker issuerChecker,
    address collector_,
    address swapper,
    address firstKeeper
  ) {
    USDC = IERC20(exaUSDC.asset());
    WETH = IWETH(payable(exaWETH.asset()));
    AUDITOR = auditor;
    EXA_USDC = exaUSDC;
    EXA_WETH = exaWETH;
    BALANCER_VAULT = balancerVault;
    DEBT_MANAGER = debtManager;
    INSTALLMENTS_ROUTER = installmentsRouter;
    ISSUER_CHECKER = issuerChecker;
    if (swapper == address(0)) revert ZeroAddress();
    SWAPPER = swapper;

    _grantRole(KEEPER_ROLE, firstKeeper);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _setCollector(collector_);

    IERC20(USDC).forceApprove(address(EXA_USDC), type(uint256).max);

    _setAllowedTarget(address(USDC), true);
    _setAllowedTarget(address(WETH), true);
  }

  function propose(IMarket market, uint256 amount, address receiver) external {
    _checkMarket(market);
    proposals[msg.sender] = Proposal({
      amount: amount,
      market: market,
      timestamp: block.timestamp,
      receiver: receiver,
      proposalType: ProposalType.WITHDRAW,
      data: ""
    });
    emit Proposed(msg.sender, market, receiver, amount, block.timestamp + PROPOSAL_DELAY);
  }

  function proposeSwap(IMarket market, IERC20 assetOut, uint256 amount, uint256 minAmountOut, bytes memory route)
    external
  {
    _checkMarket(market);
    proposals[msg.sender] = Proposal({
      amount: amount,
      market: market,
      timestamp: block.timestamp,
      receiver: msg.sender,
      proposalType: ProposalType.SWAP,
      data: abi.encode(SwapData({ assetOut: assetOut, minAmountOut: minAmountOut, route: route }))
    });
    emit SwapProposed(msg.sender, market, assetOut, amount, minAmountOut, route, block.timestamp + PROPOSAL_DELAY);
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
    uint256 balanceIn = assetIn.balanceOf(msg.sender);
    uint256 balanceOut = assetOut.balanceOf(msg.sender);

    _approveAndExecuteFromSender(SWAPPER, address(assetIn), maxAmountIn, route);

    amountOut = assetOut.balanceOf(msg.sender) - balanceOut;
    if (amountOut < minAmountOut) revert Disagreement();

    _approveFromSender(address(assetIn), SWAPPER, 0);
    amountIn = balanceIn - assetIn.balanceOf(msg.sender);
  }

  struct RollDebtData {
    uint256 repayMaturity;
    uint256 borrowMaturity;
    uint256 maxRepayAssets;
    uint256 percentage;
  }

  function proposeRollDebt(
    uint256 repayMaturity,
    uint256 borrowMaturity,
    uint256 maxRepayAssets,
    uint256 maxBorrowAssets,
    uint256 percentage
  ) external {
    if (percentage > 1e18) revert WrongValue();
    proposals[msg.sender] = Proposal({
      amount: maxBorrowAssets,
      market: EXA_USDC,
      timestamp: block.timestamp,
      receiver: msg.sender,
      proposalType: ProposalType.ROLL_DEBT,
      data: abi.encode(
        RollDebtData({
          repayMaturity: repayMaturity,
          borrowMaturity: borrowMaturity,
          maxRepayAssets: maxRepayAssets,
          percentage: percentage
        })
      )
    });
    // TODO emit event
  }

  function crossRepay(
    uint256 maturity,
    uint256 positionAssets,
    uint256 maxRepay,
    IMarket collateral,
    uint256 maxAmountIn,
    bytes calldata route
  ) external {
    _checkMarket(collateral);
    bytes memory data = _hash(
      abi.encodePacked(
        bytes1(0x02),
        abi.encode(
          CrossRepayCallbackData({
            maturity: maturity,
            borrower: msg.sender,
            positionAssets: positionAssets,
            maxRepay: maxRepay,
            marketIn: collateral,
            maxAmountIn: maxAmountIn,
            route: route
          })
        )
      )
    );
    _approveFromSender(address(collateral), address(this), maxAmountIn);
    _flashLoan(maxRepay, data);
  }

  function repay(uint256 maturity, uint256 positionAssets, uint256 maxRepay) external {
    bytes memory data = _hash(
      abi.encodePacked(
        bytes1(0x01),
        abi.encode(
          RepayCallbackData({
            maturity: maturity,
            borrower: msg.sender,
            positionAssets: positionAssets,
            maxRepay: maxRepay
          })
        )
      )
    );
    _approveFromSender(address(EXA_USDC), address(this), EXA_USDC.previewWithdraw(maxRepay));
    _flashLoan(maxRepay, data);
  }

  function rollDebt() external {
    Proposal storage proposal = proposals[msg.sender];
    if (proposal.proposalType != ProposalType.ROLL_DEBT) revert NoProposal();
    if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();

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
  }

  function withdraw() external {
    Proposal storage proposal = proposals[msg.sender];
    IMarket market = proposal.market;
    ProposalType proposalType = proposal.proposalType;
    if (address(market) == address(0) || proposalType != ProposalType.WITHDRAW && proposalType != ProposalType.SWAP) {
      revert NoProposal();
    }

    uint256 amount = proposal.amount;
    address receiver = proposal.receiver;
    _executeFromSender(
      address(market),
      0,
      abi.encodeCall(
        IERC4626.withdraw,
        (amount, market == EXA_WETH && proposal.data.length == 0 ? address(this) : receiver, msg.sender)
      )
    );

    if (proposalType == ProposalType.SWAP) {
      SwapData memory data = abi.decode(proposal.data, (SwapData));
      swap(IERC20(market.asset()), data.assetOut, amount, data.minAmountOut, data.route);
    } else if (market == EXA_WETH) {
      if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
      WETH.withdraw(amount);
      receiver.safeTransferETH(amount);
    }
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

    _checkLiquidity(borrower);
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks

  function setCollector(address collector_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setCollector(collector_);
  }

  function setAllowedTarget(address target, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setAllowedTarget(target, allowed);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function onUninstall(bytes calldata) external override {
    if (uninstallProposals[msg.sender] + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
    delete uninstallProposals[msg.sender];
    delete proposals[msg.sender];
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](17);
    manifest.executionFunctions[0] = this.propose.selector;
    manifest.executionFunctions[1] = this.proposeRollDebt.selector;
    manifest.executionFunctions[2] = this.proposeSwap.selector;
    manifest.executionFunctions[3] = this.proposeUninstall.selector;
    manifest.executionFunctions[4] = this.revokeUninstall.selector;
    manifest.executionFunctions[5] = this.swap.selector;
    manifest.executionFunctions[6] = this.crossRepay.selector;
    manifest.executionFunctions[7] = this.repay.selector;
    manifest.executionFunctions[8] = this.rollDebt.selector;
    manifest.executionFunctions[9] = this.withdraw.selector;
    manifest.executionFunctions[10] = this.collectCollateral.selector;
    manifest.executionFunctions[11] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[12] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[13] = this.collectDebit.selector;
    manifest.executionFunctions[14] = this.collectInstallments.selector;
    manifest.executionFunctions[15] = this.poke.selector;
    manifest.executionFunctions[16] = this.pokeETH.selector;

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
    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](17);

    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.propose.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.proposeRollDebt.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.proposeSwap.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.proposeUninstall.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.revokeUninstall.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.swap.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[6] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.crossRepay.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[7] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.repay.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[8] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.rollDebt.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[9] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperOrSelfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[10] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectCollateral.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[11] = ManifestAssociatedFunction({
      executionSelector: bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)")),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[12] = ManifestAssociatedFunction({
      executionSelector: bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)")),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[13] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectDebit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[14] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectInstallments.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[15] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.poke.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[16] = ManifestAssociatedFunction({
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
      uint256 amount = abi.decode(preExecHookData, (uint256));
      if (amount == type(uint256).max) delete proposals[msg.sender];
      else proposals[msg.sender].amount -= amount;
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
      uint256 assets = 0;
      bool isExecuteBatch = bytes4(callData[0:4]) == IStandardExecutor.executeBatch.selector;
      if (isExecuteBatch) {
        Call[] memory calls = abi.decode(callData[4:], (Call[]));
        for (uint256 i = 0; i < calls.length; i++) {
          Call memory call = calls[i];
          assets +=
            _preExecutionChecker(call.target, bytes4(call.data.slice(0, 4)), call.data.slice(4, callData.length));
        }
      } else {
        address target = address(bytes20(callData[16:36]));
        bytes4 selector = bytes4(callData[132:136]);
        assets = _preExecutionChecker(target, selector, callData[136:]);
      }
      return assets != 0 ? abi.encode(assets) : bytes("");
    }
    revert NotImplemented(msg.sig, functionId);
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

    IMarket proposalMarket = proposals[account].market;
    uint256 marketMap = AUDITOR.accountMarkets(account);
    uint256 sumCollateral = 0;
    uint256 sumDebtPlusEffects = 0;
    for (uint256 i = 0; i < AUDITOR.allMarkets().length; ++i) {
      IMarket market = AUDITOR.marketList(i);
      if ((marketMap & (1 << i)) != 0) {
        MarketData memory md = AUDITOR.markets(market);
        uint256 price = uint256(md.priceFeed.latestAnswer());
        (uint256 balance, uint256 borrowBalance) = market.accountSnapshot(account);

        if (market == proposalMarket) {
          uint256 amount = proposals[account].amount;

          ProposalType proposalType = proposals[msg.sender].proposalType;

          if (proposalType == ProposalType.WITHDRAW || proposalType == ProposalType.SWAP) {
            if (balance < amount) revert InsufficientLiquidity();
            balance -= amount;
          } else if (proposalType == ProposalType.ROLL_DEBT) {
            RollDebtData memory rollData = abi.decode(proposals[account].data, (RollDebtData));
            uint256 repaidDebt = _repaidDebt(account, market, rollData.repayMaturity, rollData.percentage);
            borrowBalance += amount - repaidDebt;
          } else {
            // cross repay proposal
          }
        }
        sumCollateral += balance.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
        sumDebtPlusEffects += borrowBalance.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      }
      if ((1 << i) > marketMap) break;
    }

    if (sumDebtPlusEffects > sumCollateral) revert InsufficientLiquidity();
  }

  function _repaidDebt(address account, IMarket market, uint256 maturity, uint256 percentage)
    internal
    view
    returns (uint256)
  {
    FixedPosition memory position = market.fixedBorrowPositions(maturity, account);
    uint256 positionAssets = position.principal + position.fee;

    return block.timestamp < maturity
      ? positionAssets.mulWad(percentage) - _fixedDepositYield(market, maturity, position.principal.mulWad(percentage))
      : (positionAssets + positionAssets.mulWad((block.timestamp - maturity) * market.penaltyRate())).mulWad(percentage);
  }

  function _fixedDepositYield(IMarket market, uint256 maturity, uint256 assets) internal view returns (uint256 yield) {
    FixedPool memory pool = market.fixedPools(maturity);
    if (maturity > pool.lastAccrual) {
      pool.unassignedEarnings -=
        pool.unassignedEarnings.mulDiv(block.timestamp - pool.lastAccrual, maturity - pool.lastAccrual);
    }
    return _calculateDepositYield(pool, assets, market.backupFeeRate());
  }

  function _calculateDepositYield(FixedPool memory pool, uint256 amount, uint256 backupFeeRate)
    internal
    pure
    returns (uint256)
  {
    uint256 memBackupSupplied = _backupSupplied(pool);
    uint256 backupFee = 0;
    uint256 yield = 0;
    if (memBackupSupplied != 0) {
      yield = pool.unassignedEarnings.mulDiv(Math.min(amount, memBackupSupplied), memBackupSupplied);
      backupFee = yield.mulWad(backupFeeRate);
      yield -= backupFee;
    }
    return yield;
  }

  function _backupSupplied(FixedPool memory pool) internal pure returns (uint256) {
    uint256 borrowed = pool.borrowed;
    uint256 supplied = pool.supplied;
    return borrowed - Math.min(borrowed, supplied);
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

  function _preExecutionChecker(address target, bytes4 selector, bytes memory callData) internal view returns (uint256) {
    address receiver;

    if (target == address(AUDITOR)) {
      if (selector != IAuditor.exitMarket.selector) {
        return 0;
      }
      revert Unauthorized();
    }
    if (target == address(DEBT_MANAGER)) {
      if (selector == IDebtManager.rollFixed.selector) {
        (
          IMarket market,
          uint256 repayMaturity,
          uint256 borrowMaturity,
          uint256 maxRepay,
          uint256 maxBorrow,
          uint256 percentage
        ) = abi.decode(callData, (IMarket, uint256, uint256, uint256, uint256, uint256));
        Proposal memory rollProposal = proposals[msg.sender];
        if (rollProposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();

        RollDebtData memory rollData = abi.decode(rollProposal.data, (RollDebtData));
        if (
          rollProposal.market != market || rollProposal.amount < maxBorrow || rollData.maxRepayAssets < maxRepay
            || rollData.percentage < percentage || rollData.repayMaturity != repayMaturity
            || rollData.borrowMaturity != borrowMaturity
        ) revert NoProposal();
        return type(uint256).max;
      }
      revert Unauthorized();
    }
    if (target == address(INSTALLMENTS_ROUTER)) {
      if (selector == IInstallmentsRouter.borrow.selector) {
        (,,,, receiver) = abi.decode(callData, (IMarket, uint256, uint256[], uint256, address));
        if (receiver == collector) return 0;
      }
      revert Unauthorized();
    }
    if (target == address(SWAPPER) || target == msg.sender || allowlist[target]) return 0;

    IMarket marketTarget = IMarket(target);
    if (!_isMarket(marketTarget)) revert Unauthorized();

    uint256 assets = 0;
    address owner = address(0);

    if (selector == IERC20.approve.selector) {
      (receiver,) = abi.decode(callData, (address, uint256));
      if (receiver == address(this) || receiver == address(DEBT_MANAGER) || receiver == address(INSTALLMENTS_ROUTER)) {
        return 0;
      }
      revert Unauthorized();
    } else if (selector == IERC20.transfer.selector) {
      (receiver,) = abi.decode(callData, (address, uint256));
    } else if (selector == IERC20.transferFrom.selector) {
      (, receiver,) = abi.decode(callData, (address, address, uint256));
    } else if (selector == IMarket.borrowAtMaturity.selector) {
      (,,, receiver,) = abi.decode(callData, (uint256, uint256, uint256, address, address));
      if (receiver != collector) revert Unauthorized();
      return 0;
    } else if (selector == IERC4626.withdraw.selector) {
      (assets, receiver, owner) = abi.decode(callData, (uint256, address, address));
    } else if (selector == IERC4626.redeem.selector) {
      uint256 shares;
      (shares, receiver, owner) = abi.decode(callData, (uint256, address, address));
      assets = marketTarget.convertToAssets(shares);
    } else if (selector == IMarket.borrow.selector) {
      (, receiver,) = abi.decode(callData, (uint256, address, address));
      if (receiver != collector) revert Unauthorized();
      return 0;
    } else {
      return 0;
    }

    if (receiver == address(this) || receiver == collector) return 0;

    Proposal memory proposal = proposals[owner];

    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (proposal.amount == 0) revert NoProposal();
    if (proposal.amount < assets) revert NoProposal();
    if (proposal.market != marketTarget) revert NoProposal();
    if (proposal.receiver != receiver) revert NoProposal();
    if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
    return assets;
  }

  function _setCollector(address collector_) internal {
    if (collector_ == address(0)) revert ZeroAddress();
    collector = collector_;
    emit CollectorSet(collector_, msg.sender);
  }

  function _setAllowedTarget(address target, bool allowed) internal {
    if (address(target) == address(0)) revert ZeroAddress();

    allowlist[target] = allowed;
    emit AllowedTargetSet(target, msg.sender, allowed);
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

error ZeroAddress();

interface IBalancerVault {
  function flashLoan(address recipient, IERC20[] memory tokens, uint256[] memory amounts, bytes memory data) external;
}

interface IDebtManager {
  function rollFixed(
    IMarket market,
    uint256 repayMaturity,
    uint256 borrowMaturity,
    uint256 maxRepayAssets,
    uint256 maxBorrowAssets,
    uint256 percentage
  ) external;
}

interface IInstallmentsRouter {
  function borrow(IMarket market, uint256 firstMaturity, uint256[] calldata amounts, uint256 maxRepay, address receiver)
    external
    returns (uint256[] memory assetsOwed);
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

// data starts with 0x01
struct SwapData {
  IERC20 assetOut;
  uint256 minAmountOut;
  bytes route;
}

// // data starts with 0x02
// struct RollDebtData {
//   uint256 repayMaturity;
//   uint256 borrowMaturity;
//   uint256 maxRepayAssets;
//   uint256 maxBorrowAssets;
//   uint256 percentage;
// }

// // data starts with 0x03
// struct CrossRepayData {
//   uint256 maturity;
//   uint256 positionAssets;
//   uint256 maxRepay;
//   IMarket marketIn; // borrow market
//   uint256 maxAmountIn;
//   bytes route;
// }
