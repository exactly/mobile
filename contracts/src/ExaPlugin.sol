// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.25;

import { BasePlugin } from "@alchemy/modular-account/plugins/BasePlugin.sol";
import { IPluginExecutor } from "@alchemy/modular-account/interfaces/IPluginExecutor.sol";
import {
  ManifestFunction,
  ManifestAssociatedFunctionType,
  ManifestAssociatedFunction,
  PluginManifest,
  PluginMetadata
} from "@alchemy/modular-account/interfaces/IPlugin.sol";
import { IMultiOwnerPlugin } from "@alchemy/modular-account/plugins/owner/IMultiOwnerPlugin.sol";

import { SafeTransferLib } from "solmate/src/utils/SafeTransferLib.sol";
import { Auditor, Market, ERC20 } from "@exactly/protocol/Market.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is BasePlugin, AccessControl {
  using SafeTransferLib for ERC20;

  // metadata used by the pluginMetadata() method down below
  string public constant NAME = "Account Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  Auditor public immutable auditor;

  uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION = 0;

  constructor(Auditor auditor_) {
    auditor = auditor_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  function enterMarket(IPluginExecutor account, Market market) external onlyRole(KEEPER_ROLE) {
    account.executeFromPluginExternal(address(auditor), 0, abi.encodeCall(Auditor.enterMarket, (market)));
  }

  function deposit(IPluginExecutor account, Market market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(address(market), 0, abi.encodeCall(market.deposit, (amount, address(account))));
  }

  function approve(IPluginExecutor account, Market market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(ERC20.approve, (address(market), amount))
    );
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external pure override { }

  /// @inheritdoc BasePlugin
  function onUninstall(bytes calldata) external pure override { }

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

  function checkIsMarket(Market market) public view {
    (,,, bool isMarket,) = auditor.markets(market);
    if (!isMarket) revert("ExaPlugin: not a market");
  }

  modifier onlyMarket(Market market) {
    checkIsMarket(market);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
