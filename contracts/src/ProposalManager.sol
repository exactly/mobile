// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";

import {
  AllowedTargetSet,
  IAuditor,
  IDebtManager,
  IInstallmentsRouter,
  IMarket,
  IProposalManager,
  InsufficientLiquidity,
  MarketData,
  NoProposal,
  NonceTooLow,
  NotMarket,
  Proposal,
  ProposalType,
  RollDebtData,
  Timelocked,
  Unauthorized,
  ZeroAddress
} from "./IExaAccount.sol";

contract ProposalManager is IProposalManager, AccessControl {
  using FixedPointMathLib for uint256;

  string public constant NAME = "ProposalManager";
  string public constant VERSION = "1";

  bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
  bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

  address public immutable SWAPPER;
  IAuditor public immutable AUDITOR;
  IDebtManager public immutable DEBT_MANAGER;
  IInstallmentsRouter public immutable INSTALLMENTS_ROUTER;
  uint256 public immutable PROPOSAL_DELAY = 1 minutes;

  mapping(address target => bool allowed) public allowlist;
  mapping(address account => uint256 nonce) public nonces;
  mapping(address account => uint256 nonce) public queueNonces;
  mapping(address account => mapping(uint256 nonce => Proposal lastProposal)) public proposals;

  constructor(
    address owner,
    IAuditor auditor,
    IDebtManager debtManager,
    IInstallmentsRouter installmentsRouter,
    address swapper_,
    address collector_,
    address[] memory targets
  ) {
    AUDITOR = auditor;
    DEBT_MANAGER = debtManager;
    INSTALLMENTS_ROUTER = installmentsRouter;
    if (swapper_ == address(0)) revert ZeroAddress();
    SWAPPER = swapper_;

    _grantRole(COLLECTOR_ROLE, collector_);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);

    for (uint256 i = 0; i < targets.length; ++i) {
      _setAllowedTarget(targets[i], true);
    }
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
    address receiver;

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
        if (rollProposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();

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
        (,,,, receiver) = abi.decode(callData, (IMarket, uint256, uint256[], uint256, address));
        if (hasRole(COLLECTOR_ROLE, receiver)) return nonce;
      }
      revert Unauthorized();
    }
    if (target == address(SWAPPER) || allowlist[target]) return nonce;

    IMarket marketTarget = IMarket(target);
    if (!_isMarket(marketTarget)) revert Unauthorized();

    uint256 assets = 0;
    address owner = address(0);

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
      (,,, receiver,) = abi.decode(callData, (uint256, uint256, uint256, address, address));
      if (!hasRole(COLLECTOR_ROLE, receiver)) revert Unauthorized();
      return nonce;
    } else if (selector == IERC4626.withdraw.selector) {
      (assets, receiver, owner) = abi.decode(callData, (uint256, address, address));
    } else if (selector == IERC4626.redeem.selector) {
      uint256 shares;
      (shares, receiver, owner) = abi.decode(callData, (uint256, address, address));
      assets = marketTarget.convertToAssets(shares);
    } else if (selector == IMarket.borrow.selector) {
      (, receiver,) = abi.decode(callData, (uint256, address, address));
      if (!hasRole(COLLECTOR_ROLE, receiver)) revert Unauthorized();
      return nonce;
    } else {
      return nonce;
    }

    if (hasRole(COLLECTOR_ROLE, receiver) || hasRole(PROPOSER_ROLE, receiver)) return nonce;

    Proposal memory proposal = proposals[owner][nonce];

    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (proposal.amount == 0) revert NoProposal();
    if (proposal.amount < assets) revert NoProposal();
    if (proposal.market != marketTarget) revert NoProposal();
    if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
    if (proposal.proposalType == ProposalType.WITHDRAW) {
      if (abi.decode(proposal.data, (address)) != receiver) revert NoProposal();
    }
    return nonce + 1;
  }

  function propose(address account, IMarket market, uint256 amount, ProposalType proposalType, bytes memory data)
    external
    onlyRole(PROPOSER_ROLE)
    returns (uint256 nonce)
  {
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

  function checkLiquidity(address account) external view {
    uint256 marketMap = AUDITOR.accountMarkets(account);
    uint256 sumCollateral = 0;
    uint256 sumDebtPlusEffects = 0;

    for (uint256 i = 0; i < AUDITOR.allMarkets().length; ++i) {
      IMarket market = AUDITOR.marketList(i);
      if ((marketMap & (1 << i)) != 0) {
        MarketData memory md = AUDITOR.markets(market);
        uint256 price = uint256(md.priceFeed.latestAnswer());
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
      MarketData memory md = AUDITOR.markets(proposal.market);
      uint256 price = uint256(md.priceFeed.latestAnswer());
      if (proposal.proposalType == ProposalType.ROLL_DEBT) {
        sumDebtPlusEffects += proposal.amount.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      } else {
        uint256 collateral = proposal.amount.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
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
}
