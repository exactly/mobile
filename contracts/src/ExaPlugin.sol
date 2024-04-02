// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import { Auditor, IPriceFeed, InsufficientAccountLiquidity } from "@exactly/protocol/Auditor.sol";
import { ERC20, Market } from "@exactly/protocol/Market.sol";

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import { IMultiOwnerPlugin } from "modular-account/src/plugins/owner/IMultiOwnerPlugin.sol";

import {
  ManifestAssociatedFunction,
  ManifestAssociatedFunctionType,
  ManifestExecutionHook,
  ManifestFunction,
  PluginManifest,
  PluginMetadata
} from "modular-account-libs/interfaces/IPlugin.sol";
import { IPluginExecutor } from "modular-account-libs/interfaces/IPluginExecutor.sol";
import { IStandardExecutor } from "modular-account-libs/interfaces/IStandardExecutor.sol";
import { BasePlugin } from "modular-account-libs/plugins/BasePlugin.sol";

import { FixedPointMathLib } from "solmate/src/utils/FixedPointMathLib.sol";
import { SafeTransferLib } from "solmate/src/utils/SafeTransferLib.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is BasePlugin, AccessControl {
  using FixedPointMathLib for uint256;
  using SafeCast for int256;
  using SafeTransferLib for ERC20;

  // metadata used by the pluginMetadata() method down below
  string public constant NAME = "Account Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  Auditor public immutable AUDITOR;

  uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION = 0;

  uint256 public constant BORROW_LIMIT = 1000e18;

  address public beneficiary;
  uint256 public immutable INTERVAL = 30 days; // TODO fuzz test timestamps
  uint256 public immutable PROPOSAL_DELAY = 5 minutes;
  mapping(address account => uint256 limit) public borrowLimits;
  mapping(address account => mapping(uint256 timestamp => uint256 baseAmount)) public borrows;
  mapping(address account => Proposal lastProposal) public proposals;

  constructor(Auditor auditor_, address beneficiary_) {
    AUDITOR = auditor_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setBeneficiary(beneficiary_);
  }

  function enterMarket(IPluginExecutor account, Market market) external onlyRole(KEEPER_ROLE) {
    account.executeFromPluginExternal(address(AUDITOR), 0, abi.encodeCall(Auditor.enterMarket, (market)));
  }

  function deposit(IPluginExecutor account, Market market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(address(market), 0, abi.encodeCall(market.deposit, (amount, address(account))));
  }

  function approve(IPluginExecutor account, Market market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(ERC20.approve, (address(market), amount))
    );
  }

  function borrow(IPluginExecutor account, Market market, uint256 amount) external onlyRole(KEEPER_ROLE) {
    /// @dev the next call validates the market
    (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);

    uint256 newAmount = borrows[address(account)][block.timestamp % INTERVAL]
      + amount.mulDivDown(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

    if (newAmount > borrowLimits[address(account)]) revert BorrowLimitExceeded();

    borrows[address(account)][block.timestamp % INTERVAL] = newAmount;

    account.executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.borrow, (amount, beneficiary, address(account)))
    );

    Proposal memory proposal = proposals[address(account)];
    // TODO add tests for this
    if (proposal.amount != 0) {
      (uint256 collateral, uint256 debt) = AUDITOR.accountLiquidity(address(account), proposal.market, proposal.amount);
      if (collateral < debt) revert InsufficientAccountLiquidity();
    }
  }

  function borrowAtMaturity(IPluginExecutor account, Market market, uint256 maturity, uint256 amount, uint256 maxAmount)
    external
    onlyRole(KEEPER_ROLE)
  {
    {
      /// @dev the next call validates the market
      (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);
      uint256 newAmount = borrows[address(account)][block.timestamp % INTERVAL]
        + amount.mulDivDown(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

      if (newAmount > borrowLimits[address(account)]) revert BorrowLimitExceeded();

      borrows[address(account)][block.timestamp % INTERVAL] = newAmount;
    }
    account.executeFromPluginExternal(
      address(market),
      0,
      abi.encodeCall(market.borrowAtMaturity, (maturity, amount, maxAmount, beneficiary, address(account)))
    );

    Proposal memory proposal = proposals[address(account)];
    // TODO add tests for this
    if (proposal.amount != 0) {
      (uint256 collateral, uint256 debt) = AUDITOR.accountLiquidity(address(account), proposal.market, proposal.amount);
      if (collateral < debt) revert InsufficientAccountLiquidity();
    }
  }

  function withdraw(IPluginExecutor account, Market market, uint256 amount)
    external
    onlyRole(KEEPER_ROLE)
    onlyMarket(market)
  {
    account.executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.withdraw, (amount, beneficiary, address(account)))
    );
  }

  function setBeneficiary(address beneficiary_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    beneficiary = beneficiary_;
  }

  function propose(Market market, uint256 amount) external onlyMarket(market) {
    proposals[msg.sender] = Proposal({ market: market, timestamp: block.timestamp, amount: amount });
  }

  /// @inheritdoc BasePlugin
  function preExecutionHook(uint8 functionId, address, uint256, bytes calldata callData)
    external
    view
    override
    returns (bytes memory)
  {
    if (functionId == uint8(FunctionId.VALIDATION_PROPOSAL)) {
      address target = address(bytes20(callData[16:36]));
      if (!isMarket(Market(target))) return "";

      bytes4 selector = bytes4(callData[132:136]);
      if (selector != Market.withdraw.selector) return "";

      (uint256 assets,, address owner) = abi.decode(callData[136:], (uint256, address, address));

      // TODO do the validation with the account as owner
      Proposal memory proposal = proposals[owner];

      if (proposal.amount == 0) revert NoProposal();
      if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
      if (proposal.market != Market(target)) revert WrongMarket();
      if (proposal.amount > assets) revert WrongAmount();
      return abi.encode(assets);
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function postExecutionHook(uint8 functionId, bytes calldata preExecHookData) external override {
    if (functionId == uint8(FunctionId.VALIDATION_PROPOSAL)) {
      if (preExecHookData.length == 0) return;
      // TODO add test to check that the amount is reduced
      // TODO check this is not called after a revert on the withdraw
      proposals[msg.sender].amount -= abi.decode(preExecHookData, (uint256));
      return; // success
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override {
    borrowLimits[msg.sender] = 1000e18;
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory) {
    PluginManifest memory manifest;

    manifest.dependencyInterfaceIds = new bytes4[](1);
    manifest.dependencyInterfaceIds[0] = type(IMultiOwnerPlugin).interfaceId;

    manifest.executionFunctions = new bytes4[](1);
    manifest.executionFunctions[0] = this.propose.selector;

    ManifestFunction memory ownerUserOpValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.DEPENDENCY,
      functionId: 0,
      dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
    });

    ManifestFunction memory proposedValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.VALIDATION_PROPOSAL),
      dependencyIndex: 0
    });

    manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](1);
    manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: this.propose.selector,
      associatedFunction: ownerUserOpValidationFunction
    });

    manifest.preRuntimeValidationHooks = new ManifestAssociatedFunction[](2);
    manifest.preRuntimeValidationHooks[0] = ManifestAssociatedFunction({
      executionSelector: this.enterMarket.selector,
      associatedFunction: ManifestFunction({
        functionType: ManifestAssociatedFunctionType.PRE_HOOK_ALWAYS_DENY,
        functionId: 0,
        dependencyIndex: 0
      })
    });
    manifest.preRuntimeValidationHooks[1] = ManifestAssociatedFunction({
      executionSelector: this.deposit.selector,
      associatedFunction: ManifestFunction({
        functionType: ManifestAssociatedFunctionType.PRE_HOOK_ALWAYS_DENY,
        functionId: 0,
        dependencyIndex: 0
      })
    });

    manifest.executionHooks = new ManifestExecutionHook[](3);
    manifest.executionHooks[0] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.execute.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
    });
    manifest.executionHooks[1] = ManifestExecutionHook({
      executionSelector: IStandardExecutor.executeBatch.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
    });
    manifest.executionHooks[2] = ManifestExecutionHook({
      executionSelector: IPluginExecutor.executeFromPluginExternal.selector,
      preExecHook: proposedValidationFunction,
      postExecHook: proposedValidationFunction
    });

    manifest.permitAnyExternalAddress = true;

    return manifest;
  }

  /// @inheritdoc BasePlugin
  function pluginMetadata() external pure virtual override returns (PluginMetadata memory) {
    PluginMetadata memory metadata;
    metadata.name = NAME;
    metadata.version = VERSION;
    metadata.author = AUTHOR;
    return metadata;
  }

  function checkIsMarket(Market market) public view {
    if (!isMarket(market)) revert NotMarket();
  }

  function isMarket(Market market) internal view returns (bool isMarket_) {
    (,,, isMarket_,) = AUDITOR.markets(market);
  }

  modifier onlyMarket(Market market) {
    checkIsMarket(market);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}

struct Proposal {
  Market market;
  uint256 timestamp;
  uint256 amount;
}
// idea: have an `action` enum here so we can act differently if it's borrow or withdraw

enum FunctionId {
  VALIDATION_PROPOSAL
}

error BorrowLimitExceeded();
error NoProposal();
error NotMarket();
error Timelocked();
error WrongAmount();
error WrongMarket();
