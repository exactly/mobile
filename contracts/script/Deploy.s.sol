// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { LibString } from "solady/utils/LibString.sol";

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin, IAuditor, IBalancerVault, IMarket, IVelodromeFactory } from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployScript is BaseScript {
  using LibString for uint256;
  using stdJson for string;

  ExaAccountFactory public factory;
  ExaPlugin public exaPlugin;
  IssuerChecker public issuerChecker;
  WebauthnOwnerPlugin public ownerPlugin;
  IAuditor public auditor;
  IMarket public exaUSDC;
  IBalancerVault public balancerVault;
  IVelodromeFactory public velodromeFactory;

  function setUp() external {
    ownerPlugin = WebauthnOwnerPlugin(vm.envOr("OWNER_PLUGIN_ADDRESS", address(0)));
    if (address(ownerPlugin) == address(0)) {
      ownerPlugin = WebauthnOwnerPlugin(
        vm.readFile(
          string.concat(
            "node_modules/webauthn-owner-plugin/broadcast/Plugin.s.sol/", block.chainid.toString(), "/run-latest.json"
          )
        ).readAddress(".transactions[0].contractAddress")
      );
    }
    vm.label(address(ownerPlugin), "OwnerPlugin");
    issuerChecker = IssuerChecker(vm.envOr("ISSUER_CHECKER_ADDRESS", address(0)));
    if (address(issuerChecker) == address(0)) {
      issuerChecker = IssuerChecker(
        vm.readFile(string.concat("broadcast/IssuerChecker.s.sol/", block.chainid.toString(), "/run-latest.json"))
          .readAddress(".transactions[0].contractAddress")
      );
    }
    auditor = IAuditor(protocol("Auditor"));
    exaUSDC = IMarket(protocol("MarketUSDC"));
    balancerVault = IBalancerVault(protocol("BalancerVault"));
    velodromeFactory = IVelodromeFactory(protocol("VelodromePoolFactory"));
  }

  function run() external {
    assert(msg.sender != DEFAULT_SENDER);

    vm.startBroadcast(msg.sender);

    exaPlugin = new ExaPlugin(
      auditor, exaUSDC, balancerVault, velodromeFactory, issuerChecker, vm.envAddress("COLLECTOR_ADDRESS")
    );
    factory = new ExaAccountFactory(msg.sender, ownerPlugin, exaPlugin, ACCOUNT_IMPL, ENTRYPOINT);

    factory.addStake{ value: 0.1 ether }(1 days, 0.1 ether);

    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), vm.envAddress("KEEPER_ADDRESS"));

    vm.stopBroadcast();
  }
}
