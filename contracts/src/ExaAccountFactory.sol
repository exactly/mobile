// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { IAccountInitializable } from "modular-account/src/interfaces/IAccountInitializable.sol";
import { IEntryPoint } from "modular-account/src/interfaces/erc4337/IEntryPoint.sol";
import { IMultiOwnerPlugin } from "modular-account/src/plugins/owner/IMultiOwnerPlugin.sol";

import { IPlugin } from "modular-account-libs/interfaces/IPlugin.sol";
import { FunctionReference, IPluginManager } from "modular-account-libs/interfaces/IPluginManager.sol";
import { FunctionReferenceLib } from "modular-account-libs/libraries/FunctionReferenceLib.sol";

import { PublicKey } from "webauthn-owner-plugin/IWebauthnOwnerPlugin.sol";
import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnModularAccountFactory } from "webauthn-owner-plugin/WebauthnModularAccountFactory.sol";

contract ExaAccountFactory is WebauthnModularAccountFactory {
  using FunctionReferenceLib for address;
  using OwnersLib for PublicKey;

  IPlugin public immutable EXA_PLUGIN;
  bytes32 internal immutable _EXA_PLUGIN_MANIFEST_HASH;
  FunctionReference internal immutable _OWNER_PLUGIN_DEPENDENCY;

  constructor(
    address owner,
    IPlugin webauthnOwnerPlugin,
    IPlugin exaPlugin,
    address implementation,
    IEntryPoint entryPoint
  )
    WebauthnModularAccountFactory(
      owner,
      address(webauthnOwnerPlugin),
      implementation,
      keccak256(abi.encode(webauthnOwnerPlugin.pluginManifest())),
      entryPoint
    )
  {
    EXA_PLUGIN = exaPlugin;
    _EXA_PLUGIN_MANIFEST_HASH = keccak256(abi.encode(exaPlugin.pluginManifest()));
    _OWNER_PLUGIN_DEPENDENCY = WEBAUTHN_OWNER_PLUGIN.pack(uint8(IMultiOwnerPlugin.FunctionId.USER_OP_VALIDATION_OWNER));
  }

  function _initializeAccount(IAccountInitializable account, bytes memory ownerBytes) internal override {
    PublicKey[] memory initialOwners = abi.decode(ownerBytes, (PublicKey[]));

    // temporarily add factory address as owner to install plugins after initialization
    PublicKey[] memory ownersWithFactory = new PublicKey[](initialOwners.length + 1);
    for ((uint256 i, uint256 j) = (0, 0); i < ownersWithFactory.length; ++i) {
      ownersWithFactory[i] = i == j && (j == initialOwners.length || (initialOwners[j].toAddress() > address(this)))
        ? PublicKey(uint256(uint160(address(this))), 0)
        : initialOwners[j++];
    }

    address[] memory plugins = new address[](1);
    plugins[0] = WEBAUTHN_OWNER_PLUGIN;
    bytes32[] memory manifestHashes = new bytes32[](1);
    manifestHashes[0] = _WEBAUTHN_OWNER_PLUGIN_MANIFEST_HASH;
    bytes[] memory initBytes = new bytes[](1);
    initBytes[0] = abi.encode(ownersWithFactory);
    account.initialize(plugins, abi.encode(manifestHashes, initBytes));

    FunctionReference[] memory dependencies = new FunctionReference[](1);
    dependencies[0] = _OWNER_PLUGIN_DEPENDENCY;
    IPluginManager(address(account)).installPlugin({
      plugin: address(EXA_PLUGIN),
      manifestHash: _EXA_PLUGIN_MANIFEST_HASH,
      pluginInstallData: "",
      dependencies: dependencies
    });

    address[] memory ownersToRemove = new address[](1);
    ownersToRemove[0] = address(this);
    IMultiOwnerPlugin(address(account)).updateOwners(new address[](0), ownersToRemove);
  }
}
