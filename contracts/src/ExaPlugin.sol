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
import { IStandardExecutor } from "modular-account-libs/interfaces/IStandardExecutor.sol";
import { BasePlugin } from "modular-account-libs/plugins/BasePlugin.sol";

import { WETH } from "solady/tokens/WETH.sol";
import { ECDSA } from "solady/utils/ECDSA.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";
import { SafeTransferLib } from "solady/utils/SafeTransferLib.sol";

import {
  CollectorSet,
  FixedPool,
  FixedPosition,
  IAuditor,
  IExaAccount,
  IMarket,
  InsufficientLiquidity,
  KeeperFeeModelSet,
  MarketData,
  MinHealthFactorSet,
  NoBalance,
  NoProposal,
  NotMarket,
  Proposal,
  Proposed,
  Timelocked,
  Unauthorized,
  WrongValue
} from "./IExaAccount.sol";
import { IssuerChecker } from "./IssuerChecker.sol";
import { KeeperFeeModel } from "./KeeperFeeModel.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin, IExaAccount {
  using FixedPointMathLib for uint256;
  using SafeTransferLib for address;
  using SafeCastLib for int256;
  using SafeERC20 for IERC20;
  using Address for address;
  using ECDSA for bytes32;

  string public constant NAME = "Exa Plugin";
  string public constant VERSION = "0.0.2";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  address public constant LIFI = 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE;
  IAuditor public immutable AUDITOR;
  IMarket public immutable EXA_USDC;
  IMarket public immutable EXA_WETH;
  IBalancerVault public immutable BALANCER_VAULT;
  IDebtManager public immutable DEBT_MANAGER;
  IInstallmentsRouter public immutable INSTALLMENTS_ROUTER;
  IssuerChecker public immutable ISSUER_CHECKER;

  uint256 public immutable INTERVAL = 30 days;
  uint256 public immutable PROPOSAL_DELAY = 5 minutes;
  uint256 public immutable OPERATION_EXPIRY = 15 minutes;

  address public collector;
  KeeperFeeModel public keeperFeeModel;
  uint256 public minHealthFactor;
  mapping(address account => Proposal lastProposal) public proposals;

  bytes32 private callHash;

  constructor(
    IAuditor auditor,
    IMarket exaUSDC,
    IMarket exaWETH,
    IBalancerVault balancerVault,
    IDebtManager debtManager,
    IInstallmentsRouter installmentsRouter,
    IssuerChecker issuerChecker,
    address collector_,
    KeeperFeeModel keeperFeeModel_
  ) {
    AUDITOR = auditor;
    EXA_USDC = exaUSDC;
    EXA_WETH = exaWETH;
    BALANCER_VAULT = balancerVault;
    DEBT_MANAGER = debtManager;
    INSTALLMENTS_ROUTER = installmentsRouter;
    ISSUER_CHECKER = issuerChecker;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setCollector(collector_);
    setKeeperFeeModel(keeperFeeModel_);
    setMinHealthFactor(1e18);

    IERC20(EXA_USDC.asset()).forceApprove(address(EXA_USDC), type(uint256).max);
  }

  function propose(IMarket market, uint256 amount, address receiver) external onlyMarket(market) {
    proposals[msg.sender] = Proposal({ amount: amount, market: market, timestamp: block.timestamp, receiver: receiver });
    emit Proposed(msg.sender, market, receiver, amount, block.timestamp + PROPOSAL_DELAY);
  }

  function repay(uint256 maturity) external {
    uint256 positionAssets;
    uint256 maxRepay;
    (positionAssets, maxRepay) = _previewRepay(maturity);

    uint256 amount = maxRepay.min(EXA_USDC.maxWithdraw(msg.sender));
    positionAssets = positionAssets.min(EXA_USDC.maxWithdraw(msg.sender));

    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC20.approve, (address(this), EXA_USDC.previewWithdraw(amount)))
    );
    _flashLoan(
      amount,
      BalancerCallbackData({
        maturity: maturity,
        borrower: msg.sender,
        positionAssets: positionAssets.min(EXA_USDC.maxWithdraw(msg.sender)),
        maxRepay: amount,
        marketIn: IMarket(address(0)),
        amountIn: 0,
        route: ""
      })
    );
  }

  function crossRepay(
    uint256 maturity,
    uint256 positionAssets,
    uint256 maxRepay,
    IMarket collateral,
    uint256 amountIn,
    bytes calldata route
  ) external onlyMarket(collateral) {
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(collateral), 0, abi.encodeCall(IERC20.approve, (address(this), amountIn))
    );
    _flashLoan(
      maxRepay,
      BalancerCallbackData({
        maturity: maturity,
        borrower: msg.sender,
        positionAssets: positionAssets,
        maxRepay: maxRepay,
        marketIn: collateral,
        amountIn: amountIn,
        route: route
      })
    );
  }

  function rollDebt(
    uint256 repayMaturity,
    uint256 borrowMaturity,
    uint256 maxRepayAssets,
    uint256 maxBorrowAssets,
    uint256 percentage
  ) external {
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC20.approve, (address(DEBT_MANAGER), maxRepayAssets))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(DEBT_MANAGER),
      0,
      abi.encodeCall(
        IDebtManager.rollFixed, (EXA_USDC, repayMaturity, borrowMaturity, maxRepayAssets, maxBorrowAssets, percentage)
      )
    );
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
  ) public onlyIssuer(amount, timestamp, signature) {
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC),
      0,
      abi.encodeCall(IMarket.borrowAtMaturity, (maturity, amount, maxRepay, collector, msg.sender))
    );
    _checkLiquidity(msg.sender);
  }

  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature)
    external
    onlyIssuer(amount, timestamp, signature)
  {
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC4626.withdraw, (amount, collector, msg.sender))
    );
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
    ISSUER_CHECKER.checkIssuer(msg.sender, totalAmount, timestamp, signature);

    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC20.approve, (address(INSTALLMENTS_ROUTER), maxRepay))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(INSTALLMENTS_ROUTER),
      0,
      abi.encodeCall(IInstallmentsRouter.borrow, (EXA_USDC, firstMaturity, amounts, maxRepay, collector))
    );
    _checkLiquidity(msg.sender);
  }

  function poke(IMarket market) external onlyMarket(market) {
    uint256 balance = IERC20(market.asset()).balanceOf(msg.sender);
    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (balance == 0) revert NoBalance();

    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(IERC20.approve, (address(market), balance))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(IERC4626.deposit, (balance, msg.sender))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market))
    );
  }

  function pokeETH() external {
    uint256 balance = msg.sender.balance;
    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (balance == 0) revert NoBalance();

    address weth = EXA_WETH.asset();
    IPluginExecutor(msg.sender).executeFromPluginExternal(weth, balance, abi.encodeCall(WETH.deposit, ()));

    IPluginExecutor(msg.sender).executeFromPluginExternal(
      weth, 0, abi.encodeCall(IERC20.approve, (address(EXA_WETH), balance))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_WETH), 0, abi.encodeCall(IERC4626.deposit, (balance, msg.sender))
    );
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (EXA_WETH))
    );
  }

  function withdraw() external {
    Proposal storage proposal = proposals[msg.sender];
    address market = address(proposal.market);
    if (market == address(0)) revert NoProposal();

    if (market != address(EXA_WETH)) {
      IPluginExecutor(msg.sender).executeFromPluginExternal(
        market, 0, abi.encodeCall(IERC4626.withdraw, (proposal.amount, proposal.receiver, msg.sender))
      );
      return;
    }
    uint256 amount = proposal.amount;
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      market, 0, abi.encodeCall(IERC4626.withdraw, (amount, address(this), msg.sender))
    );
    WETH(payable(EXA_WETH.asset())).withdraw(amount);
    proposal.receiver.safeTransferETH(amount);
  }

  function setCollector(address collector_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (collector_ == address(0)) revert ZeroAddress();
    collector = collector_;
    emit CollectorSet(collector_, msg.sender);
  }

  function setKeeperFeeModel(KeeperFeeModel keeperFeeModel_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (address(keeperFeeModel_) == address(0)) revert ZeroAddress();
    keeperFeeModel = keeperFeeModel_;
    emit KeeperFeeModelSet(address(keeperFeeModel_), msg.sender);
  }

  function setMinHealthFactor(uint256 minHealthFactor_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (minHealthFactor_ < 1e18) revert WrongValue();
    minHealthFactor = minHealthFactor_;
    emit MinHealthFactorSet(minHealthFactor_, msg.sender);
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
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_BALANCER)) {
      if (msg.sender != address(BALANCER_VAULT)) revert Unauthorized();
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
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED)) {
      IMarket target = IMarket(address(bytes20(callData[16:36])));
      if (!_isMarket(target)) return "";

      bytes4 selector = bytes4(callData[132:136]);
      uint256 assets;
      address owner;
      address receiver;
      if (selector == IERC4626.withdraw.selector) {
        (assets, receiver, owner) = abi.decode(callData[136:], (uint256, address, address));
      } else if (selector == IERC4626.redeem.selector) {
        uint256 shares;
        (shares, receiver, owner) = abi.decode(callData[136:], (uint256, address, address));
        assets = target.convertToAssets(shares);
      } else {
        return "";
      }

      if (receiver == address(this) || receiver == collector) return "";

      Proposal memory proposal = proposals[owner];

      // slither-disable-next-line incorrect-equality -- unsigned zero check
      if (proposal.amount == 0) revert NoProposal();
      if (proposal.amount < assets) revert NoProposal();
      if (proposal.market != target) revert NoProposal();
      if (proposal.receiver != receiver && target != EXA_WETH || receiver != address(this) && target == EXA_WETH) {
        revert NoProposal();
      }
      if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
      return abi.encode(assets);
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function postExecutionHook(uint8 functionId, bytes calldata preExecHookData) external override {
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED)) {
      if (preExecHookData.length == 0) return;
      proposals[msg.sender].amount -= abi.decode(preExecHookData, (uint256));
      return;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function onUninstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](12);
    manifest.executionFunctions[0] = this.propose.selector;
    manifest.executionFunctions[1] = this.repay.selector;
    manifest.executionFunctions[2] = this.crossRepay.selector;
    manifest.executionFunctions[3] = this.rollDebt.selector;
    manifest.executionFunctions[4] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[5] = bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)"));
    manifest.executionFunctions[6] = this.collectDebit.selector;
    manifest.executionFunctions[7] = this.collectInstallments.selector;
    manifest.executionFunctions[8] = this.poke.selector;
    manifest.executionFunctions[9] = this.pokeETH.selector;
    manifest.executionFunctions[10] = this.withdraw.selector;
    manifest.executionFunctions[11] = this.receiveFlashLoan.selector;

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
    ManifestFunction memory balancerRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_BALANCER),
      dependencyIndex: 0
    });
    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](12);
    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.propose.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.repay.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.crossRepay.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.rollDebt.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: bytes4(bytes4(keccak256("collectCredit(uint256,uint256,uint256,bytes)"))),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: bytes4(bytes4(keccak256("collectCredit(uint256,uint256,uint256,uint256,bytes)"))),
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[6] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectDebit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[7] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectInstallments.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[8] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.poke.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[9] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.pokeETH.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[10] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[11] = ManifestAssociatedFunction({
      executionSelector: this.receiveFlashLoan.selector,
      associatedFunction: balancerRuntimeValidationFunction
    });

    ManifestFunction memory proposedValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED),
      dependencyIndex: 0
    });
    manifest.executionHooks = new ManifestExecutionHook[](3);
    manifest.executionHooks[0] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.execute.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
    });
    manifest.executionHooks[1] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.executeBatch.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
    });
    manifest.executionHooks[2] = ManifestExecutionHook({
      executionSelector: IPluginExecutor.executeFromPluginExternal.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
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

  function receiveFlashLoan(IERC20[] memory, uint256[] memory, uint256[] memory, bytes memory data) external {
    // slither-disable-next-line incorrect-equality -- hash comparison
    assert(msg.sender == address(BALANCER_VAULT) && callHash == keccak256(data));
    delete callHash;

    BalancerCallbackData memory b = abi.decode(data, (BalancerCallbackData));

    uint256 actualRepay;
    if (b.amountIn == 0) {
      actualRepay = EXA_USDC.repayAtMaturity(b.maturity, b.positionAssets, b.maxRepay, b.borrower).min(
        EXA_USDC.maxWithdraw(b.borrower)
      );

      assert(actualRepay <= b.maxRepay);
      if (actualRepay < b.maxRepay) EXA_USDC.deposit(b.maxRepay - actualRepay, b.borrower);

      EXA_USDC.withdraw(b.maxRepay, address(BALANCER_VAULT), b.borrower);
    } else {
      actualRepay = EXA_USDC.repayAtMaturity(b.maturity, b.positionAssets, b.maxRepay, b.borrower);

      b.marketIn.withdraw(b.amountIn, address(this), b.borrower);

      uint256 balance = IERC20(EXA_USDC.asset()).balanceOf(address(this));
      IERC20(b.marketIn.asset()).approve(LIFI, b.amountIn);
      LIFI.functionCall(b.route);
      uint256 received = IERC20(EXA_USDC.asset()).balanceOf(address(this)) - balance;

      IERC20(EXA_USDC.asset()).safeTransfer(address(BALANCER_VAULT), b.maxRepay);
      EXA_USDC.deposit(received - actualRepay, b.borrower);
    }
  }

  receive() external payable { } // solhint-disable-line no-empty-blocks

  function _checkLiquidity(address account) internal view {
    IMarket withdrawMarket = proposals[account].market;
    uint256 marketMap = AUDITOR.accountMarkets(account);
    uint256 sumCollateral = 0;
    uint256 sumDebtPlusEffects = 0;
    for (uint256 i = 0; i < AUDITOR.allMarkets().length; ++i) {
      IMarket market = AUDITOR.marketList(i);
      if ((marketMap & (1 << i)) != 0) {
        MarketData memory md = AUDITOR.markets(market);
        uint256 price = uint256(md.priceFeed.latestAnswer());
        (uint256 balance, uint256 borrowBalance) = market.accountSnapshot(account);

        if (market == withdrawMarket) {
          uint256 amount = proposals[account].amount;
          if (balance < amount) revert InsufficientLiquidity();
          balance -= amount;
        }
        sumCollateral += balance.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
        sumDebtPlusEffects += borrowBalance.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      }
      if ((1 << i) > marketMap) break;
    }

    if (sumDebtPlusEffects != 0 && sumCollateral.divWad(sumDebtPlusEffects) < minHealthFactor) {
      revert InsufficientLiquidity();
    }
  }

  function _checkMarket(IMarket market) internal view {
    if (!_isMarket(market)) revert NotMarket();
  }

  function _flashLoan(uint256 amount, BalancerCallbackData memory b) internal {
    IERC20[] memory tokens = new IERC20[](1);
    tokens[0] = IERC20(EXA_USDC.asset());
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = amount;

    BALANCER_VAULT.flashLoan(address(this), tokens, amounts, _hash(abi.encode(b)));
  }

  function _fixedDepositYield(IMarket market, uint256 maturity, uint256 assets) internal view returns (uint256 yield) {
    FixedPool memory pool = market.fixedPools(maturity);
    if (maturity > pool.lastAccrual) {
      pool.unassignedEarnings -=
        pool.unassignedEarnings.mulDiv(block.timestamp - pool.lastAccrual, maturity - pool.lastAccrual);
    }
    uint256 backupFee = 0;
    uint256 backupSupplied = pool.borrowed - (pool.borrowed < pool.supplied ? pool.borrowed : pool.supplied);
    if (backupSupplied != 0) {
      yield = pool.unassignedEarnings.mulDiv(assets < backupSupplied ? assets : backupSupplied, backupSupplied);
      backupFee = yield.mulWad(market.backupFeeRate());
      yield -= backupFee;
    }
  }

  function _hash(bytes memory data) internal returns (bytes memory) {
    callHash = keccak256(data);
    return data;
  }

  function _isMarket(IMarket market) internal view returns (bool) {
    return AUDITOR.markets(market).isListed;
  }

  function _previewRepay(uint256 maturity) internal view returns (uint256 positionAssets, uint256 maxRepay) {
    FixedPosition memory position = EXA_USDC.fixedBorrowPositions(maturity, msg.sender);
    positionAssets = position.principal + position.fee;
    maxRepay = block.timestamp < maturity
      ? positionAssets - _fixedDepositYield(EXA_USDC, maturity, position.principal)
      : positionAssets + positionAssets.mulWad((block.timestamp - maturity) * EXA_USDC.penaltyRate());
  }

  modifier onlyMarket(IMarket market) {
    _checkMarket(market);
    _;
  }

  modifier onlyIssuer(uint256 amount, uint256 timestamp, bytes calldata signature) {
    ISSUER_CHECKER.checkIssuer(msg.sender, amount, timestamp, signature);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return interfaceId == type(IExaAccount).interfaceId || super.supportsInterface(interfaceId);
  }
}

enum FunctionId {
  RUNTIME_VALIDATION_SELF,
  RUNTIME_VALIDATION_KEEPER,
  RUNTIME_VALIDATION_BALANCER,
  PRE_EXEC_VALIDATION_PROPOSED
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

interface IVelodromeFactory {
  function getFee(address pool, bool stable) external view returns (uint24);
  function getPool(address tokenA, address tokenB, bool stable) external view returns (address);
  function isPool(address pool) external view returns (bool);
}

interface IVelodromePool {
  function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
  function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast);
}

struct BalancerCallbackData {
  uint256 maturity;
  address borrower;
  uint256 positionAssets;
  uint256 maxRepay;
  IMarket marketIn;
  uint256 amountIn;
  bytes route;
}
