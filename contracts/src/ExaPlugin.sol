// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20, IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

import { IMultiOwnerPlugin } from "modular-account/src/plugins/owner/IMultiOwnerPlugin.sol";

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

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin {
  using FixedPointMathLib for uint256;
  using SafeCastLib for int256;

  // metadata used by the pluginMetadata() method down below
  string public constant NAME = "Account Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  IAuditor public immutable AUDITOR;

  uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION = 0;

  uint256 public constant BORROW_LIMIT = 1000e18;

  address public paymentReceiver;
  uint256 public immutable INTERVAL = 30 days;
  mapping(IPluginExecutor account => uint256 limit) public borrowLimits;
  mapping(IPluginExecutor account => mapping(uint256 timestamp => uint256 baseAmount)) public borrows;

  constructor(IAuditor auditor_, address paymentReceiver_) {
    AUDITOR = auditor_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setPaymentReceiver(paymentReceiver_);
  }

  function enterMarket(IPluginExecutor account, IMarket market) external onlyRole(KEEPER_ROLE) {
    account.executeFromPluginExternal(address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market)));
  }

  function deposit(IPluginExecutor account, IMarket market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(address(market), 0, abi.encodeCall(market.deposit, (amount, address(account))));
  }

  function approve(IPluginExecutor account, IMarket market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(IERC20.approve, (address(market), amount))
    );
  }

  function borrow(IPluginExecutor account, IMarket market, uint256 amount) external onlyRole(KEEPER_ROLE) {
    /// @dev the next call validates the market
    (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);

    uint256 newAmount =
      borrows[account][block.timestamp % INTERVAL] + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

    if (newAmount > borrowLimits[account]) revert BorrowLimitExceeded();

    borrows[account][block.timestamp % INTERVAL] = newAmount;

    account.executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.borrow, (amount, paymentReceiver, address(account)))
    );
  }

  function borrowAtMaturity(
    IPluginExecutor account,
    IMarket market,
    uint256 maturity,
    uint256 amount,
    uint256 maxAmount
  ) external onlyRole(KEEPER_ROLE) {
    {
      /// @dev the next call validates the market
      (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);
      uint256 newAmount = borrows[account][block.timestamp % INTERVAL]
        + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

      if (newAmount > borrowLimits[account]) revert BorrowLimitExceeded();

      borrows[account][block.timestamp % INTERVAL] = newAmount;
    }
    account.executeFromPluginExternal(
      address(market),
      0,
      abi.encodeCall(market.borrowAtMaturity, (maturity, amount, maxAmount, paymentReceiver, address(account)))
    );
  }

  function withdraw(IPluginExecutor account, IMarket market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.withdraw, (amount, paymentReceiver, address(account)))
    );
  }

  function setPaymentReceiver(address paymentReceiver_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    paymentReceiver = paymentReceiver_;
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override {
    borrowLimits[IPluginExecutor(msg.sender)] = 1000e18;
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory) {
    PluginManifest memory manifest;

    manifest.dependencyInterfaceIds = new bytes4[](1);
    manifest.dependencyInterfaceIds[0] = type(IMultiOwnerPlugin).interfaceId;

    manifest.executionFunctions = new bytes4[](2);
    manifest.executionFunctions[0] = this.enterMarket.selector;
    manifest.executionFunctions[1] = this.deposit.selector;

    ManifestFunction memory ownerUserOpValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.DEPENDENCY,
      functionId: 0,
      dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
    });

    manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](2);
    manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: this.enterMarket.selector,
      associatedFunction: ownerUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: this.deposit.selector,
      associatedFunction: ownerUserOpValidationFunction
    });

    manifest.preRuntimeValidationHooks = new ManifestAssociatedFunction[](2);
    manifest.preRuntimeValidationHooks[0] = ManifestAssociatedFunction({
      executionSelector: this.enterMarket.selector,
      associatedFunction: ManifestFunction({
        functionType: ManifestAssociatedFunctionType.PRE_HOOK_ALWAYS_DENY,
        functionId: 0,
        dependencyIndex: 0
      })
    });
    manifest.preRuntimeValidationHooks[1] = ManifestAssociatedFunction({
      executionSelector: this.deposit.selector,
      associatedFunction: ManifestFunction({
        functionType: ManifestAssociatedFunctionType.PRE_HOOK_ALWAYS_DENY,
        functionId: 0,
        dependencyIndex: 0
      })
    });

    manifest.permitAnyExternalAddress = true;

    return manifest;
  }

  /// @inheritdoc BasePlugin
  function pluginMetadata() external pure virtual override returns (PluginMetadata memory) {
    PluginMetadata memory metadata;
    metadata.name = NAME;
    metadata.version = VERSION;
    metadata.author = AUTHOR;
    return metadata;
  }

  function checkIsMarket(IMarket market) public view {
    (,,, bool isMarket,) = AUDITOR.markets(market);
    if (!isMarket) revert NotMarket();
  }

  modifier onlyMarket(IMarket market) {
    checkIsMarket(market);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}

error BorrowLimitExceeded();
error NotMarket();

interface IAuditor {
  function markets(IMarket market)
    external
    view
    returns (uint128 adjustFactor, uint8 decimals, uint8 index, bool isListed, IPriceFeed priceFeed);
  function enterMarket(IMarket market) external;
}

interface IMarket is IERC4626 {
  function borrow(uint256 assets, address receiver, address borrower) external returns (uint256 borrowShares);
  function borrowAtMaturity(uint256 maturity, uint256 assets, uint256 maxAssets, address receiver, address borrower)
    external
    returns (uint256 assetsOwed);
}

interface IPriceFeed {
  function latestAnswer() external view returns (int256);
}
