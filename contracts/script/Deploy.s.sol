// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { LibString } from "solady/utils/LibString.sol";

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IAuditor } from "../src/ExaPlugin.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployScript is BaseScript {
  using LibString for uint256;
  using stdJson for string;

  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;
  WebauthnOwnerPlugin public ownerPlugin;
  IAuditor public auditor;

  function setUp() external {
    ownerPlugin = WebauthnOwnerPlugin(
      vm.readFile(
        string.concat(
          "../node_modules/webauthn-owner-plugin/broadcast/Plugin.s.sol/", block.chainid.toString(), "/run-latest.json"
        )
      ).readAddress(".transactions[0].contractAddress")
    );
    auditor = IAuditor(protocol("Auditor"));
  }

  function run() external {
    assert(msg.sender != DEFAULT_SENDER);

    vm.startBroadcast(msg.sender);

    exaPlugin = new ExaPlugin(auditor, msg.sender);
    factory = new ExaAccountFactory(msg.sender, ownerPlugin, exaPlugin, ACCOUNT_IMPL, ENTRYPOINT);

    factory.addStake{ value: 0.1 ether }(1 days, 0.1 ether);

    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), vm.envAddress("KEEPER_ADDRESS"));

    vm.stopBroadcast();
  }
}
