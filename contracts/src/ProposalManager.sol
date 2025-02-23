// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import {
  AllowedTargetSet,
  BorrowAtMaturityData,
  DelaySet,
  IAuditor,
  IDebtManager,
  IInstallmentsRouter,
  IMarket,
  IProposalManager,
  InsufficientLiquidity,
  InvalidDelay,
  MarketData,
  NoProposal,
  NonceTooLow,
  NotMarket,
  Proposal,
  ProposalType,
  RollDebtData,
  Timelocked,
  Unauthorized,
  ZeroAddress,
  ZeroAmount
} from "./IExaAccount.sol";

contract ProposalManager is IProposalManager, Initializable, AccessControlUpgradeable {
  using FixedPointMathLib for uint256;

  string public constant NAME = "ProposalManager";
  string public constant VERSION = "1";

  bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
  bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  address public immutable SWAPPER;
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  IAuditor public immutable AUDITOR;
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  IDebtManager public immutable DEBT_MANAGER;
  /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
  IInstallmentsRouter public immutable INSTALLMENTS_ROUTER;

  uint256 public delay;
  mapping(address target => bool allowed) public allowlist;
  mapping(address account => uint256 nonce) public nonces;
  mapping(address account => uint256 nonce) public queueNonces;
  mapping(address account => mapping(uint256 nonce => Proposal lastProposal)) public proposals;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor(IAuditor auditor, IDebtManager debtManager, IInstallmentsRouter installmentsRouter, address swapper_) {
    AUDITOR = auditor;
    DEBT_MANAGER = debtManager;
    INSTALLMENTS_ROUTER = installmentsRouter;
    if (swapper_ == address(0)) revert ZeroAddress();
    SWAPPER = swapper_;

    _disableInitializers();
  }

  function initialize(address owner, address collector_, address[] memory targets, uint256 delay_) external initializer {
    __AccessControl_init();

    _grantRole(COLLECTOR_ROLE, collector_);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);

    for (uint256 i = 0; i < targets.length; ++i) {
      _setAllowedTarget(targets[i], true);
    }

    _setDelay(delay_);
  }

  function nextProposal(address account) external view returns (Proposal memory proposal) {
    uint256 nonce = nonces[account];
    if (nonce == queueNonces[account]) revert NoProposal();
    proposal = proposals[account][nonce];
  }

  function preExecutionChecker(address sender, uint256 nonce, address target, bytes4 selector, bytes memory callData)
    external
    view
    returns (uint256 nextNonce)
  {
    if (target == address(AUDITOR)) {
      if (selector != IAuditor.exitMarket.selector) return nonce;
      revert Unauthorized();
    }
    if (target == address(DEBT_MANAGER)) {
      if (selector == IDebtManager.rollFixed.selector) {
        (
          IMarket market,
          uint256 repayMaturity,
          uint256 borrowMaturity,
          uint256 maxRepay,
          uint256 maxBorrow,
          uint256 percentage
        ) = abi.decode(callData, (IMarket, uint256, uint256, uint256, uint256, uint256));
        Proposal memory rollProposal = proposals[sender][nonce];
        if (rollProposal.timestamp + delay > block.timestamp) revert Timelocked();

        RollDebtData memory rollData = abi.decode(rollProposal.data, (RollDebtData));
        if (
          rollProposal.market != market || rollProposal.amount < maxBorrow || rollData.maxRepayAssets < maxRepay
            || rollData.percentage < percentage || rollData.repayMaturity != repayMaturity
            || rollData.borrowMaturity != borrowMaturity
        ) revert NoProposal();
        return nonce + 1;
      }
      revert Unauthorized();
    }
    if (target == address(INSTALLMENTS_ROUTER)) {
      if (selector == IInstallmentsRouter.borrow.selector) {
        (,,,, address receiver) = abi.decode(callData, (IMarket, uint256, uint256[], uint256, address));
        if (hasRole(COLLECTOR_ROLE, receiver)) return nonce;
      }
      revert Unauthorized();
    }
    if (target == address(SWAPPER) || allowlist[target]) return nonce;

    IMarket marketTarget = IMarket(target);
    if (!_isMarket(marketTarget)) revert Unauthorized();

    return _preExecutionMarketCheck(sender, nonce, marketTarget, selector, callData);
  }

  function _preExecutionMarketCheck(
    address sender,
    uint256 nonce,
    IMarket target,
    bytes4 selector,
    bytes memory callData
  ) internal view returns (uint256 nextNonce) {
    uint256 amount = 0;
    address owner = address(0);
    address receiver = address(0);

    Proposal memory proposal;
    if (selector == IERC20.approve.selector) {
      (receiver,) = abi.decode(callData, (address, uint256));
      if (
        receiver == address(DEBT_MANAGER) || receiver == address(INSTALLMENTS_ROUTER)
          || hasRole(PROPOSER_ROLE, receiver)
      ) {
        return nonce;
      }
      revert Unauthorized();
    } else if (selector == IERC20.transfer.selector) {
      (receiver,) = abi.decode(callData, (address, uint256));
    } else if (selector == IERC20.transferFrom.selector) {
      (, receiver,) = abi.decode(callData, (address, address, uint256));
    } else if (selector == IMarket.borrowAtMaturity.selector) {
      uint256 maturity;
      uint256 maxAssets;
      (maturity, amount, maxAssets, receiver,) = abi.decode(callData, (uint256, uint256, uint256, address, address));
      if (hasRole(COLLECTOR_ROLE, receiver)) return nonce;
      proposal = proposals[sender][nonce];

      if (proposal.proposalType == ProposalType.BORROW_AT_MATURITY) {
        if (proposal.timestamp + delay > block.timestamp) revert Timelocked();
        BorrowAtMaturityData memory borrowData = abi.decode(proposal.data, (BorrowAtMaturityData));
        if (
          borrowData.maturity != maturity || borrowData.maxAssets < maxAssets || borrowData.receiver != receiver
            || proposal.amount < amount
        ) {
          revert NoProposal();
        }
        return nonce + 1;
      }
      revert Unauthorized();
    } else if (selector == IERC4626.withdraw.selector || selector == IERC4626.redeem.selector) {
      (amount, receiver, owner) = abi.decode(callData, (uint256, address, address));
    } else if (selector == IMarket.borrow.selector) {
      (, receiver,) = abi.decode(callData, (uint256, address, address));
      if (!hasRole(COLLECTOR_ROLE, receiver)) revert Unauthorized();
      return nonce;
    } else {
      return nonce;
    }

    if (hasRole(COLLECTOR_ROLE, receiver) || hasRole(PROPOSER_ROLE, receiver)) return nonce;

    proposal = proposals[owner][nonce];

    return _checkMarketProposal(proposal, target, amount, receiver, nonce);
  }

  function _checkMarketProposal(
    Proposal memory proposal,
    IMarket target,
    uint256 amount,
    address receiver,
    uint256 nonce
  ) internal view returns (uint256) {
    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (proposal.amount == 0) revert NoProposal();
    if (proposal.amount < amount) revert NoProposal();
    if (proposal.market != target) revert NoProposal();
    if (proposal.timestamp + delay > block.timestamp) revert Timelocked();
    if (proposal.proposalType == ProposalType.WITHDRAW || proposal.proposalType == ProposalType.REDEEM) {
      if (abi.decode(proposal.data, (address)) != receiver) revert NoProposal();
    }
    return nonce + 1;
  }

  function propose(address account, IMarket market, uint256 amount, ProposalType proposalType, bytes memory data)
    external
    onlyRole(PROPOSER_ROLE)
    returns (uint256 nonce)
  {
    if (amount == 0) revert ZeroAmount();
    _checkMarket(market);
    nonce = queueNonces[account];
    proposals[account][nonce] =
      Proposal({ amount: amount, market: market, timestamp: block.timestamp, proposalType: proposalType, data: data });
    queueNonces[account] = nonce + 1;
  }

  function setNonce(address account, uint256 nonce) external onlyRole(PROPOSER_ROLE) {
    if (nonce <= nonces[account]) revert NonceTooLow();
    if (nonce > queueNonces[account]) revert NoProposal();
    nonces[account] = nonce;
  }

  function setAllowedTarget(address target, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setAllowedTarget(target, allowed);
  }

  function setDelay(uint256 delay_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setDelay(delay_);
  }

  function checkLiquidity(address account) external view {
    uint256 marketMap = AUDITOR.accountMarkets(account);
    uint256 sumCollateral = 0;
    uint256 sumDebtPlusEffects = 0;

    uint256 marketCount = AUDITOR.allMarkets().length;
    for (uint256 i = 0; i < marketCount; ++i) {
      // slither-disable-next-line calls-loop -- won't revert
      IMarket market = AUDITOR.marketList(i);
      if ((marketMap & (1 << i)) != 0) {
        // slither-disable-next-line calls-loop -- won't revert
        MarketData memory md = AUDITOR.markets(market);
        // slither-disable-next-line calls-loop -- won't revert
        uint256 price = uint256(md.priceFeed.latestAnswer());
        // slither-disable-next-line calls-loop -- won't revert
        (uint256 balance, uint256 borrowBalance) = market.accountSnapshot(account);

        sumCollateral += balance.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
        sumDebtPlusEffects += borrowBalance.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      }
      if ((1 << i) > marketMap) break;
    }

    uint256 queueNonce = queueNonces[account];
    for (uint256 i = nonces[account]; i < queueNonce; ++i) {
      Proposal memory proposal = proposals[account][i];
      if (proposal.amount == 0) continue;
      // slither-disable-next-line calls-loop -- won't revert
      MarketData memory md = AUDITOR.markets(proposal.market);
      // slither-disable-next-line calls-loop -- won't revert
      uint256 price = uint256(md.priceFeed.latestAnswer());
      if (proposal.proposalType == ProposalType.ROLL_DEBT) {
        sumDebtPlusEffects += proposal.amount.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      } else if (proposal.proposalType == ProposalType.BORROW_AT_MATURITY) {
        BorrowAtMaturityData memory borrowData = abi.decode(proposal.data, (BorrowAtMaturityData));
        sumDebtPlusEffects += borrowData.maxAssets.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      } else {
        // slither-disable-next-line calls-loop -- won't revert
        uint256 assets = proposal.proposalType == ProposalType.REDEEM
          ? proposal.market.convertToAssets(proposal.amount)
          : proposal.amount;
        uint256 collateral = assets.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
        if (sumCollateral < collateral) revert InsufficientLiquidity();
        sumCollateral -= collateral;
      }
    }

    if (sumDebtPlusEffects > sumCollateral) revert InsufficientLiquidity();
  }

  function _checkMarket(IMarket market) internal view {
    if (!_isMarket(market)) revert NotMarket();
  }

  function _isMarket(IMarket market) internal view returns (bool) {
    return AUDITOR.markets(market).isListed;
  }

  function _setAllowedTarget(address target, bool allowed) internal {
    if (address(target) == address(0)) revert ZeroAddress();

    allowlist[target] = allowed;
    emit AllowedTargetSet(target, msg.sender, allowed);
  }

  function _setDelay(uint256 delay_) internal {
    if (delay_ == 0 || delay_ > 1 hours) revert InvalidDelay();
    delay = delay_;
    emit DelaySet(delay_);
  }
}
