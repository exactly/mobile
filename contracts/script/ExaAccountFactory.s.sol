// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin } from "../src/ExaPlugin.sol";
import { ProposalManager } from "../src/ProposalManager.sol";
import { BaseScript } from "./Base.s.sol";

contract DeployExaAccountFactory is BaseScript {
  ExaAccountFactory public factory;

  function run() external {
    address admin = acct("admin");
    address ownerPlugin = dependency("webauthn-owner-plugin", "WebauthnOwnerPlugin", "Plugin", 0);
    ExaPlugin exaPlugin = ExaPlugin(payable(broadcast("ExaPlugin")));
    ProposalManager proposalManager = ProposalManager(broadcast("ProposalManager"));

    vm.startBroadcast(admin);

    factory = ExaAccountFactory(
      payable(
        CREATE3_FACTORY.deploy(
          keccak256(abi.encode(exaPlugin.NAME(), exaPlugin.VERSION())),
          abi.encodePacked(
            vm.getCode("ExaAccountFactory.sol:ExaAccountFactory"),
            abi.encode(admin, ownerPlugin, exaPlugin, ACCOUNT_IMPL, ENTRYPOINT)
          )
        )
      )
    );

    factory.addStake{ value: 0.1 ether }(1 days, 0.1 ether);

    proposalManager.grantRole(keccak256("PROPOSER_ROLE"), address(exaPlugin));

    vm.stopBroadcast();
  }
}
