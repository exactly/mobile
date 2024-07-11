// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";

import {
  ManifestAssociatedFunction,
  ManifestAssociatedFunctionType,
  ManifestFunction,
  PluginManifest,
  PluginMetadata
} from "modular-account-libs/interfaces/IPlugin.sol";
import { IPluginExecutor } from "modular-account-libs/interfaces/IPluginExecutor.sol";
import { BasePlugin } from "modular-account-libs/plugins/BasePlugin.sol";

import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";

import {
  BorrowLimitExceeded, IAuditor, IExaAccount, IMarket, IPriceFeed, NotAuthorized, NotMarket
} from "./IExaAccount.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin, IExaAccount {
  using FixedPointMathLib for uint256;
  using SafeCastLib for int256;

  // metadata used by the pluginMetadata() method down below
  string public constant NAME = "Exa Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  IAuditor public immutable AUDITOR;

  uint256 public constant BORROW_LIMIT = 1000e18;

  address public paymentReceiver;
  uint256 public immutable INTERVAL = 30 days;
  mapping(address account => uint256 limit) public borrowLimits;
  mapping(address account => mapping(uint256 timestamp => uint256 baseAmount)) public borrows;

  constructor(IAuditor auditor_, address paymentReceiver_) {
    AUDITOR = auditor_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setPaymentReceiver(paymentReceiver_);
  }

  function enterMarket(IMarket market) external {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market))
    );
  }

  function deposit(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.deposit, (amount, msg.sender))
    );
  }

  function approve(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(IERC20.approve, (address(market), amount))
    );
  }

  function borrow(IMarket market, uint256 amount) external {
    // slither-disable-next-line unused-return -- unneeded
    (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);

    // slither-disable-next-line weak-prng -- not prng
    uint256 newAmount = borrows[msg.sender][block.timestamp % INTERVAL]
      + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

    if (newAmount > borrowLimits[msg.sender]) revert BorrowLimitExceeded();

    // slither-disable-next-line weak-prng -- not prng
    borrows[msg.sender][block.timestamp % INTERVAL] = newAmount;

    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.borrow, (amount, paymentReceiver, msg.sender))
    );
  }

  function borrowAtMaturity(IMarket market, uint256 maturity, uint256 amount, uint256 maxAmount) external {
    {
      // slither-disable-next-line unused-return -- unneeded
      (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);
      // slither-disable-next-line weak-prng -- not prng
      uint256 newAmount = borrows[msg.sender][block.timestamp % INTERVAL]
        + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

      if (newAmount > borrowLimits[msg.sender]) revert BorrowLimitExceeded();

      // slither-disable-next-line weak-prng -- not prng
      borrows[msg.sender][block.timestamp % INTERVAL] = newAmount;
    }
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market),
      0,
      abi.encodeCall(market.borrowAtMaturity, (maturity, amount, maxAmount, paymentReceiver, msg.sender))
    );
  }

  function withdraw(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.withdraw, (amount, paymentReceiver, msg.sender))
    );
  }

  function setPaymentReceiver(address paymentReceiver_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (paymentReceiver_ == address(0)) revert ZeroAddress();
    paymentReceiver = paymentReceiver_;
  }

  /// @inheritdoc BasePlugin
  function runtimeValidationFunction(uint8 functionId, address sender, uint256, bytes calldata) external view override {
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_KEEPER)) {
      if (!hasRole(KEEPER_ROLE, sender)) revert NotAuthorized();
      return;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override {
    borrowLimits[msg.sender] = 1000e18;
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](6);
    manifest.executionFunctions[0] = this.enterMarket.selector;
    manifest.executionFunctions[1] = this.approve.selector;
    manifest.executionFunctions[2] = this.deposit.selector;
    manifest.executionFunctions[3] = this.withdraw.selector;
    manifest.executionFunctions[4] = this.borrow.selector;
    manifest.executionFunctions[5] = this.borrowAtMaturity.selector;

    ManifestFunction memory keeperRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_KEEPER),
      dependencyIndex: 0
    });

    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](6);
    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.enterMarket.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.approve.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.deposit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrow.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrowAtMaturity.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });

    manifest.permitAnyExternalAddress = true;

    return manifest;
  }

  /// @inheritdoc BasePlugin
  function pluginMetadata() external pure virtual override returns (PluginMetadata memory metadata) {
    metadata.name = NAME;
    metadata.version = VERSION;
    metadata.author = AUTHOR;
  }

  function checkIsMarket(IMarket market) public view {
    // slither-disable-next-line unused-return -- unneeded
    (,,, bool isMarket,) = AUDITOR.markets(market);
    if (!isMarket) revert NotMarket();
  }

  modifier onlyMarket(IMarket market) {
    checkIsMarket(market);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return interfaceId == type(IExaAccount).interfaceId || super.supportsInterface(interfaceId);
  }
}

enum FunctionId {
  RUNTIME_VALIDATION_KEEPER
}

error ZeroAddress();
