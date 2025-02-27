// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { ACCOUNT_IMPL, ENTRYPOINT } from "webauthn-owner-plugin/../script/Factory.s.sol";
import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";

import { BaseScript } from "../../script/Base.s.sol";
import { ExaAccountFactory } from "../../src/ExaAccountFactory.sol";
import { ExaPlugin } from "../../src/ExaPlugin.sol";
import { IExaAccount } from "../../src/IExaAccount.sol";

contract BobExecuteScript is BaseScript {
  using OwnersLib for address[];

  ExaPlugin public exaPlugin;
  ExaAccountFactory public factory;
  IExaAccount public bobAccount;

  function setUp() external {
    protocol("EXA");
    protocol("USDC");
    protocol("Auditor");
    protocol("MarketEXA");
    protocol("MarketUSDC");
    protocol("BalancerVault");
    broadcast("ProposalManager");

    skip(10 minutes);
    exaPlugin = ExaPlugin(payable(broadcast("Deploy")));
    factory = ExaAccountFactory(
      payable(
        CREATE3_FACTORY.getDeployed(acct("deployer"), keccak256(abi.encode(exaPlugin.NAME(), exaPlugin.VERSION())))
      )
    );
    address[] memory owners = new address[](1);
    owners[0] = vm.addr(0xb0b);
    bobAccount = IExaAccount(factory.createAccount(0, owners.toPublicKeys()));
    vm.label(address(exaPlugin), "ExaPlugin");
    vm.label(address(factory), "ExaAccountFactory");
    vm.label(address(bobAccount), "bobAccount");
    vm.label(address(ENTRYPOINT), "EntryPoint");
    vm.label(address(ACCOUNT_IMPL), "Account_Impl");
  }

  function run() external {
    vm.startBroadcast(acct("keeper"));
    bobAccount.executeProposal();
    bobAccount.executeProposal();
    bobAccount.executeProposal();
    vm.stopBroadcast();
  }
}
