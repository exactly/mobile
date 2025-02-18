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

  mapping(address account => Proposal lastProposal) public proposals;
  mapping(address target => bool allowed) public allowlist;

  constructor(
    address owner,
    IAuditor auditor,
    IDebtManager debtManager,
    IInstallmentsRouter installmentsRouter,
    address swapper_,
    address collector_,
    IERC20 usdc,
    IERC20 weth
  ) {
    AUDITOR = auditor;
    DEBT_MANAGER = debtManager;
    INSTALLMENTS_ROUTER = installmentsRouter;
    SWAPPER = swapper_;

    _grantRole(COLLECTOR_ROLE, collector_);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);

    _setAllowedTarget(address(usdc), true);
    _setAllowedTarget(address(weth), true);
  }

  function decreaseAmount(address account, uint256 amount) external onlyRole(PROPOSER_ROLE) {
    uint256 currentAmount = proposals[account].amount;
    proposals[account].amount = currentAmount - amount;
  }

  function preExecutionChecker(address sender, address target, bytes4 selector, bytes memory callData)
    external
    view
    returns (uint256)
  {
    address receiver;

    if (target == address(AUDITOR)) {
      if (selector != IAuditor.exitMarket.selector) {
        return 0;
      }
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
        Proposal memory rollProposal = proposals[sender];
        if (rollProposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();

        RollDebtData memory rollData = abi.decode(rollProposal.data, (RollDebtData));
        if (
          rollProposal.market != market || rollProposal.amount < maxBorrow || rollData.maxRepayAssets < maxRepay
            || rollData.percentage < percentage || rollData.repayMaturity != repayMaturity
            || rollData.borrowMaturity != borrowMaturity
        ) revert NoProposal();
        return type(uint256).max;
      }
      revert Unauthorized();
    }
    if (target == address(INSTALLMENTS_ROUTER)) {
      if (selector == IInstallmentsRouter.borrow.selector) {
        (,,,, receiver) = abi.decode(callData, (IMarket, uint256, uint256[], uint256, address));
        if (hasRole(COLLECTOR_ROLE, receiver)) return 0;
      }
      revert Unauthorized();
    }
    if (target == address(SWAPPER) || allowlist[target]) return 0;

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
        return 0;
      }
      revert Unauthorized();
    } else if (selector == IERC20.transfer.selector) {
      (receiver,) = abi.decode(callData, (address, uint256));
    } else if (selector == IERC20.transferFrom.selector) {
      (, receiver,) = abi.decode(callData, (address, address, uint256));
    } else if (selector == IMarket.borrowAtMaturity.selector) {
      (,,, receiver,) = abi.decode(callData, (uint256, uint256, uint256, address, address));
      if (!hasRole(COLLECTOR_ROLE, receiver)) revert Unauthorized();
      return 0;
    } else if (selector == IERC4626.withdraw.selector) {
      (assets, receiver, owner) = abi.decode(callData, (uint256, address, address));
    } else if (selector == IERC4626.redeem.selector) {
      uint256 shares;
      (shares, receiver, owner) = abi.decode(callData, (uint256, address, address));
      assets = marketTarget.convertToAssets(shares);
    } else if (selector == IMarket.borrow.selector) {
      (, receiver,) = abi.decode(callData, (uint256, address, address));
      if (!hasRole(COLLECTOR_ROLE, receiver)) revert Unauthorized();
      return 0;
    } else {
      return 0;
    }

    if (hasRole(COLLECTOR_ROLE, receiver) || hasRole(PROPOSER_ROLE, receiver)) return 0;

    Proposal memory proposal = proposals[owner];

    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (proposal.amount == 0) revert NoProposal();
    if (proposal.amount < assets) revert NoProposal();
    if (proposal.market != marketTarget) revert NoProposal();
    if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
    if (proposal.proposalType == ProposalType.WITHDRAW) {
      if (abi.decode(proposal.data, (address)) != receiver) revert NoProposal();
    }
    return assets;
  }

  function propose(address account, IMarket market, uint256 amount, ProposalType proposalType, bytes memory data)
    external
    onlyRole(PROPOSER_ROLE)
  {
    _checkMarket(market);
    proposals[account] =
      Proposal({ amount: amount, market: market, timestamp: block.timestamp, proposalType: proposalType, data: data });
  }

  function revoke(address account) external onlyRole(PROPOSER_ROLE) {
    delete proposals[account];
  }

  function setAllowedTarget(address target, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setAllowedTarget(target, allowed);
  }

  function checkLiquidity(address account) external view {
    IMarket proposalMarket = proposals[account].market;
    uint256 marketMap = AUDITOR.accountMarkets(account);
    uint256 sumCollateral = 0;
    uint256 sumDebtPlusEffects = 0;
    ProposalType proposalType = proposals[account].proposalType;
    uint256 amount = proposals[account].amount;

    for (uint256 i = 0; i < AUDITOR.allMarkets().length; ++i) {
      IMarket market = AUDITOR.marketList(i);
      if ((marketMap & (1 << i)) != 0) {
        MarketData memory md = AUDITOR.markets(market);
        uint256 price = uint256(md.priceFeed.latestAnswer());
        (uint256 balance, uint256 borrowBalance) = market.accountSnapshot(account);

        if (market == proposalMarket) {
          if (proposalType == ProposalType.ROLL_DEBT) {
            borrowBalance += amount;
          } else {
            if (balance < amount) revert InsufficientLiquidity();
            balance -= amount;
          }
        }

        sumCollateral += balance.mulDiv(price, 10 ** md.decimals).mulWad(md.adjustFactor);
        sumDebtPlusEffects += borrowBalance.mulDivUp(price, 10 ** md.decimals).divWadUp(md.adjustFactor);
      }
      if ((1 << i) > marketMap) break;
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
