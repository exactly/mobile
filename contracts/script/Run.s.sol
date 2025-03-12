// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import {
  ExaPlugin,
  IAuditor,
  IDebtManager,
  IFlashLoaner,
  IInstallmentsRouter,
  IMarket,
  Parameters
} from "../src/ExaPlugin.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { ProposalManager } from "../src/ProposalManager.sol";

import { BaseScript } from "./Base.s.sol";

contract RunScript is BaseScript {
  function run() external {
    // bytes memory data = hex"00000000000000000000000000000000000000000000000000000000123869d5000000000000000000000000000000000000000000000000000000001908b100";
    // (uint256 assets, uint256 positionAssets) = abi.decode(data, (uint256, uint256));
    // emit log_named_uint("        assets", assets);
    // emit log_named_uint("positionAssets", positionAssets);

    // data = hex"0000000000000000000000000000000000000000000000000000000000d495f30000000000000000000000000000000000000000000000000000000004e33880";
    // (assets, positionAssets) = abi.decode(data, (uint256, uint256));
    // emit log("");
    // emit log_named_uint("        assets", assets);
    // emit log_named_uint("positionAssets", positionAssets);

    // bytes memory data = hex"0000000000000000000000002bbaf52f13513ce325066d387c1da1f260c2688700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000482b4290000000000000000000000000000000000000000000000000000000000";
    // (address plugin, uint8 functionId, bytes memory revertReason) = abi.decode(data, (address, uint8, bytes));
    // emit log_named_address("plugin", plugin);
    // emit log_named_uint("functionId", functionId);
    // emit log_named_bytes("revertReason", revertReason);

    vm.createSelectFork("optimism", 133_098_884);
    address account = 0xaAc7C457135135De03cb557f013F0fC5585d0538;
    address exaPlugin = 0x2Bbaf52f13513CE325066D387c1dA1F260c26887;
    address previewer = 0x12aF1C16AA8edCA467F3598C3691a8577A4ff761;
    vm.label(account, "account");
    vm.label(exaPlugin, "ExaPlugin");
    vm.label(previewer, "ExaPreviewer");

    vm.pauseTracing();
    address newPlugin = address(
      new ExaPlugin(
        Parameters({
          owner: acct("admin"),
          auditor: IAuditor(protocol("Auditor")),
          exaUSDC: IMarket(protocol("MarketUSDC")),
          exaWETH: IMarket(protocol("MarketWETH")),
          flashLoaner: IFlashLoaner(protocol("BalancerVault")),
          debtManager: IDebtManager(protocol("DebtManager")),
          installmentsRouter: IInstallmentsRouter(protocol("InstallmentsRouter")),
          // issuerChecker: IssuerChecker(broadcast("IssuerChecker")),
          // proposalManager: ProposalManager(broadcast("ProposalManager")),
          issuerChecker: IssuerChecker(0xAAC0780c9e17F6FAbD1C6d34b80001bE10F50a28),
          proposalManager: ProposalManager(0x827e9FCF0B0710EbB754695fAA813cA67e3c7458),
          collector: acct("collector"),
          swapper: acct("swapper"),
          firstKeeper: acct("keeper")
        })
      )
    );
    vm.etch(exaPlugin, newPlugin.code);
    vm.resumeTracing();
    // vm.prank(acct("admin"));
    // ExaPlugin(payable(exaPlugin)).grantRole(keccak256("KEEPER_ROLE"), previewer);
    // emit log_named_address("issuer", IssuerChecker(broadcast("IssuerChecker")).issuer());
    vm.store(
      address(exaPlugin),
      keccak256(abi.encode(previewer, keccak256(abi.encode(keccak256("KEEPER_ROLE"), uint256(0))))),
      bytes32(uint256(1))
    );
    vm.startPrank(account);
    // solhint-disable-next-line avoid-low-level-calls
    (bool success,) = previewer.call(
      hex"8980d703000000000000000000000000000000000000000000000000000000000499d3700000000000000000000000000000000000000000000000000000000067d1b4c0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000418eb394d712abb4c5926b7066792c18298c284822452f3da9c8aeac481e2ed015735c75eee30bf0688f0170013a3a0f40c6d22f7b90ecc771815979c0a0b981a71b00000000000000000000000000000000000000000000000000000000000000"
    );
    assert(success);
  }
}
