// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { ForkTest } from "./Fork.t.sol";
import { Auditor } from "@exactly/protocol/Auditor.sol";
import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";
import { OwnersLib } from "webauthn-owner-plugin/OwnersLib.sol";
import { WebauthnOwnerPlugin } from "webauthn-owner-plugin/WebauthnOwnerPlugin.sol";

import { DeployScript } from "../script/Deploy.s.sol";
import { DeployExaPreviewer } from "../script/ExaPreviewer.s.sol";
import { DeployIssuerChecker } from "../script/IssuerChecker.s.sol";
import { DeployProposalManager } from "../script/ProposalManager.s.sol";
import { DeployRefunder } from "../script/Refunder.s.sol";

import { ExaAccountFactory } from "../src/ExaAccountFactory.sol";
import { ExaPlugin } from "../src/ExaPlugin.sol";
import {
  ExaPreviewer, ICollectableMarket, IProposalManager, PendingProposal, ProposalType
} from "../src/ExaPreviewer.sol";
import { IExaAccount } from "../src/IExaAccount.sol";
import { IssuerChecker } from "../src/IssuerChecker.sol";
import { Refunder } from "../src/Refunder.sol";

import { DeployAccount } from "./mocks/Account.s.sol";
import { DeployMocks } from "./mocks/Mocks.s.sol";
import { DeployProtocol } from "./mocks/Protocol.s.sol";

// solhint-disable-next-line max-states-count
contract ExaPreviewerTest is ForkTest {
  using OwnersLib for address[];

  address internal owner;
  uint256 internal ownerKey;
  address internal issuer;
  uint256 internal issuerKey;
  address[] internal owners;
  address payable internal collector;
  IExaAccount internal account;
  ExaPlugin internal exaPlugin;
  ExaAccountFactory internal factory;
  WebauthnOwnerPlugin internal ownerPlugin;
  IssuerChecker internal issuerChecker;
  IProposalManager internal proposalManager;
  bytes32 internal domainSeparator;
  Refunder internal refunder;

  Auditor internal auditor;
  ICollectableMarket internal exaEXA;
  ICollectableMarket internal exaUSDC;
  ICollectableMarket internal exaWETH;
  MockERC20 internal exa;
  MockERC20 internal usdc;

  ExaPreviewer internal previewer;

  function setUp() external {
    collector = payable(makeAddr("collector"));
    (owner, ownerKey) = makeAddrAndKey("owner");
    owners = new address[](1);
    owners[0] = owner;
    (issuer, issuerKey) = makeAddrAndKey("issuer");

    ownerPlugin = new WebauthnOwnerPlugin();

    vm.store(address(this), keccak256(abi.encode("admin")), bytes32(uint256(uint160(address(this)))));
    vm.store(address(this), keccak256(abi.encode("deployer")), bytes32(uint256(uint160(address(this)))));
    vm.store(address(this), keccak256(abi.encode("keeper")), bytes32(uint256(uint160(address(this)))));
    vm.store(address(this), keccak256(abi.encode("collector")), bytes32(uint256(uint160(address(collector)))));
    new DeployAccount().run();
    DeployProtocol p = new DeployProtocol();
    p.run();
    auditor = p.auditor();
    exaEXA = ICollectableMarket(address(p.exaEXA()));
    exaUSDC = ICollectableMarket(address(p.exaUSDC()));
    exaWETH = ICollectableMarket(address(p.exaWETH()));
    exa = p.exa();
    usdc = p.usdc();

    DeployIssuerChecker ic = new DeployIssuerChecker();
    set("issuer", issuer);
    ic.run();
    unset("issuer");
    issuerChecker = ic.issuerChecker();

    DeployMocks m = new DeployMocks();
    set("Auditor", address(auditor));
    set("USDC", address(usdc));
    m.run();
    unset("Auditor");
    unset("USDC");

    DeployRefunder r = new DeployRefunder();
    set("MarketUSDC", address(exaUSDC));
    set("IssuerChecker", address(issuerChecker));
    r.run();
    unset("MarketUSDC");
    unset("IssuerChecker");
    refunder = r.refunder();

    DeployProposalManager pm = new DeployProposalManager();
    set("Auditor", address(auditor));
    set("DebtManager", address(p.debtManager()));
    set("InstallmentsRouter", address(p.installmentsRouter()));
    set("swapper", address(m.swapper()));
    pm.run();
    unset("Auditor");
    unset("DebtManager");
    unset("InstallmentsRouter");
    unset("swapper");
    proposalManager = pm.proposalManager();

    DeployScript d = new DeployScript();
    set("Auditor", address(p.auditor()));
    set("MarketUSDC", address(exaUSDC));
    set("MarketWETH", address(exaWETH));
    set("BalancerVault", address(p.balancer()));
    set("DebtManager", address(p.debtManager()));
    set("InstallmentsRouter", address(p.installmentsRouter()));
    set("IssuerChecker", address(issuerChecker));
    set("ProposalManager", address(proposalManager));
    set("WebauthnOwnerPlugin", address(ownerPlugin));
    d.run();
    unset("Auditor");
    unset("MarketUSDC");
    unset("MarketWETH");
    unset("BalancerVault");
    unset("DebtManager");
    unset("InstallmentsRouter");
    unset("IssuerChecker");
    unset("ProposalManager");
    unset("WebauthnOwnerPlugin");
    exaPlugin = d.exaPlugin();
    factory = d.factory();
    domainSeparator = issuerChecker.DOMAIN_SEPARATOR();

    DeployExaPreviewer ep = new DeployExaPreviewer();
    set("MarketUSDC", address(exaUSDC));
    set("ProposalManager", address(proposalManager));
    ep.run();
    unset("MarketUSDC");
    unset("ProposalManager");
    previewer = ep.previewer();

    account = IExaAccount(payable(factory.createAccount(0, owners.toPublicKeys())));
    vm.deal(address(account), 10_000 ether);
    vm.label(address(account), "account");

    exa.mint(address(account), 10_000e18);
    usdc.mint(address(account), 100_000e6);

    vm.stopPrank();
  }

  // solhint-disable func-name-mixedcase

  function test_utilizations_returns() external view {
    previewer.utilizations();
  }

  function test_pendingProposals_returnsPendingProposals() external {
    account.poke(exaEXA);
    account.poke(exaUSDC);

    vm.startPrank(address(account));
    account.propose(exaEXA, 100e18, ProposalType.WITHDRAW, abi.encode(address(0x1)));
    account.propose(exaUSDC, 10e6, ProposalType.WITHDRAW, abi.encode(address(0x2)));
    uint256 timestamp = block.timestamp;

    PendingProposal[] memory pendingProposals = previewer.pendingProposals(address(account));
    assertEq(pendingProposals.length, 2);
    assertEq(pendingProposals[0].nonce, 0);
    assertEq(pendingProposals[1].nonce, 1);
    assertEq(pendingProposals[0].proposal.amount, 100e18);
    assertEq(pendingProposals[1].proposal.amount, 10e6);
    assertTrue(pendingProposals[0].proposal.market == exaEXA);
    assertTrue(pendingProposals[1].proposal.market == exaUSDC);
    assertTrue(pendingProposals[0].proposal.proposalType == ProposalType.WITHDRAW);
    assertTrue(pendingProposals[1].proposal.proposalType == ProposalType.WITHDRAW);
    assertEq(pendingProposals[0].proposal.timestamp, timestamp);
    assertEq(pendingProposals[1].proposal.timestamp, timestamp);
    assertEq(abi.decode(pendingProposals[0].proposal.data, (address)), address(0x1));
    assertEq(abi.decode(pendingProposals[1].proposal.data, (address)), address(0x2));

    skip(proposalManager.delay());
    account.executeProposal();

    pendingProposals = previewer.pendingProposals(address(account));
    assertEq(pendingProposals.length, 1);
    assertEq(pendingProposals[0].nonce, 1);
    assertEq(pendingProposals[0].proposal.amount, 10e6);
    assertTrue(pendingProposals[0].proposal.market == exaUSDC);
    assertTrue(pendingProposals[0].proposal.proposalType == ProposalType.WITHDRAW);
    assertEq(pendingProposals[0].proposal.timestamp, timestamp);
    assertEq(abi.decode(pendingProposals[0].proposal.data, (address)), address(0x2));

    account.executeProposal();

    pendingProposals = previewer.pendingProposals(address(account));
    assertEq(pendingProposals.length, 0);
  }

  // solhint-enable func-name-mixedcase
}
