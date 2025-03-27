// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import { LibString } from "solady/utils/LibString.sol";
import { Surl } from "surl/Surl.sol";

import { IAuditor, IDebtManager, IInstallmentsRouter, IMarket } from "../src/ExaPlugin.sol";
import { ProposalManager } from "../src/ProposalManager.sol";

import { BaseScript, stdJson } from "./Base.s.sol";

contract DeployProposalManager is BaseScript {
  using LibString for uint256;
  using stdJson for string;
  using Surl for string;

  ProposalManager public proposalManager;

  address[] private allowlist;
  mapping(address asset => bool supported) private protocolAssets;

  function run() external {
    string memory deploy = vm.readFile("deploy.json");
    IAuditor auditor = IAuditor(protocol("Auditor"));
    IMarket[] memory markets = auditor.allMarkets();
    for (uint256 i = 0; i < markets.length; ++i) {
      address asset = markets[i].asset();
      allowlist.push(asset);
      protocolAssets[asset] = true;
      protocolAssets[address(markets[i])] = true;
    }
    allowlist.push(acct("swapper"));

    if (acct("swapper") == 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE) {
      vm.pauseTracing();
      (uint256 status, bytes memory data) =
        string.concat("https://li.quest/v1/tokens?chains=", block.chainid.toString()).get();
      assert(status == 200);
      for (uint256 i = 0; true; ++i) {
        try vm.parseJsonAddress(
          string(data), string.concat(".tokens.", block.chainid.toString(), "[", i.toString(), "].address")
        ) returns (address asset) {
          if (asset == address(0) || protocolAssets[asset]) continue;
          allowlist.push(asset);
        } catch {
          break;
        }
      }
      vm.resumeTracing();
    }

    vm.broadcast(acct("deployer"));
    proposalManager = new ProposalManager(
      acct("admin"),
      auditor,
      IDebtManager(protocol("DebtManager")),
      IInstallmentsRouter(protocol("InstallmentsRouter")),
      acct("collector"),
      allowlist,
      deploy.readUint(".proposalManager.delay")
    );
  }
}
