// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

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
import { UserOperation } from "modular-account-libs/interfaces/UserOperation.sol";
import { SIG_VALIDATION_FAILED, SIG_VALIDATION_PASSED } from "modular-account-libs/libraries/Constants.sol";
import { BasePlugin } from "modular-account-libs/plugins/BasePlugin.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";

import {
  BorrowLimitExceeded,
  IAuditor,
  IExaAccount,
  IMarket,
  IPriceFeed,
  NoProposal,
  NotAuthorized,
  NotMarket,
  Timelocked,
  WrongAmount,
  WrongMarket,
  WrongReceiver
} from "./IExaAccount.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin, IExaAccount {
  using FixedPointMathLib for uint256;
  using SafeCastLib for int256;
  using ECDSA for bytes32;

  // metadata used by the pluginMetadata() method down below
  string public constant NAME = "Exa Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  IAuditor public immutable AUDITOR;
  uint256 public immutable INTERVAL = 30 days;
  uint256 public immutable PROPOSAL_DELAY = 5 minutes;

  address public collector;
  mapping(address account => uint256 limit) public borrowLimits;
  mapping(address account => mapping(uint256 timestamp => uint256 baseAmount)) public borrows;
  mapping(address account => Proposal lastProposal) public proposals;

  constructor(IAuditor auditor_, address collector_) {
    AUDITOR = auditor_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setCollector(collector_);
  }

  function propose(IMarket market, uint256 amount, address receiver) external onlyMarket(market) {
    proposals[msg.sender] = Proposal({ amount: amount, market: market, timestamp: block.timestamp, receiver: receiver });
  }

  function enterMarket(IMarket market) external {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market))
    );
  }

  function deposit(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.deposit, (amount, msg.sender))
    );
  }

  function approve(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(IERC20.approve, (address(market), amount))
    );
  }

  function borrow(IMarket market, uint256 amount) external {
    // slither-disable-next-line unused-return -- unneeded
    (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);

    // slither-disable-next-line weak-prng -- not prng
    uint256 newAmount = borrows[msg.sender][block.timestamp % INTERVAL]
      + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

    if (newAmount > borrowLimits[msg.sender]) revert BorrowLimitExceeded();

    // slither-disable-next-line weak-prng -- not prng
    borrows[msg.sender][block.timestamp % INTERVAL] = newAmount;

    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.borrow, (amount, collector, msg.sender))
    );
  }

  function borrowAtMaturity(IMarket market, uint256 maturity, uint256 amount, uint256 maxAmount) external {
    {
      // slither-disable-next-line unused-return -- unneeded
      (, uint8 decimals,,, IPriceFeed priceFeed) = AUDITOR.markets(market);
      // slither-disable-next-line weak-prng -- not prng
      uint256 newAmount = borrows[msg.sender][block.timestamp % INTERVAL]
        + amount.mulDiv(priceFeed.latestAnswer().toUint256(), 10 ** decimals);

      if (newAmount > borrowLimits[msg.sender]) revert BorrowLimitExceeded();

      // slither-disable-next-line weak-prng -- not prng
      borrows[msg.sender][block.timestamp % INTERVAL] = newAmount;
    }
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.borrowAtMaturity, (maturity, amount, maxAmount, collector, msg.sender))
    );
  }

  function withdraw(IMarket market, uint256 amount) external onlyMarket(market) {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(market.withdraw, (amount, proposals[msg.sender].receiver, msg.sender))
    );
  }

  function setCollector(address collector_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (collector_ == address(0)) revert ZeroAddress();
    collector = collector_;
  }

  /// @inheritdoc BasePlugin
  function userOpValidationFunction(uint8 functionId, UserOperation calldata userOp, bytes32 userOpHash)
    external
    view
    override
    returns (uint256)
  {
    if (functionId == uint8(FunctionId.USER_OP_VALIDATION_KEEPER)) {
      address signer = userOpHash.toEthSignedMessageHash().tryRecoverCalldata(userOp.signature);
      if (signer != address(0) && hasRole(KEEPER_ROLE, signer)) return SIG_VALIDATION_PASSED;
      return SIG_VALIDATION_FAILED;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function runtimeValidationFunction(uint8 functionId, address sender, uint256, bytes calldata) external view override {
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_SELF)) {
      if (msg.sender != sender) revert NotAuthorized();
      return;
    }

    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_KEEPER)) {
      if (!hasRole(KEEPER_ROLE, sender)) revert NotAuthorized();
      return;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function preExecutionHook(uint8 functionId, address, uint256, bytes calldata callData)
    external
    view
    override
    returns (bytes memory)
  {
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED)) {
      IMarket target = IMarket(address(bytes20(callData[16:36])));
      if (!isMarket(target)) return "";

      bytes4 selector = bytes4(callData[132:136]);
      uint256 assets;
      address owner;
      address receiver;
      if (selector == IERC4626.withdraw.selector) {
        (assets, receiver, owner) = abi.decode(callData[136:], (uint256, address, address));
      } else if (selector == IERC4626.redeem.selector) {
        uint256 shares;
        (shares, receiver, owner) = abi.decode(callData[136:], (uint256, address, address));
        assets = target.convertToAssets(shares);
      } else {
        return "";
      }

      Proposal memory proposal = proposals[owner];

      if (proposal.amount == 0) revert NoProposal();
      if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
      if (proposal.amount < assets) revert WrongAmount();
      if (proposal.market != target) revert WrongMarket();
      if (proposal.receiver != receiver) revert WrongReceiver();
      return abi.encode(assets);
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function postExecutionHook(uint8 functionId, bytes calldata preExecHookData) external override {
    if (functionId == uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED)) {
      if (preExecHookData.length == 0) return;
      proposals[msg.sender].amount -= abi.decode(preExecHookData, (uint256));
      return;
    }
    revert NotImplemented(msg.sig, functionId);
  }

  /// @inheritdoc BasePlugin
  function onInstall(bytes calldata) external override {
    borrowLimits[msg.sender] = 1000e18;
  }

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](7);
    manifest.executionFunctions[0] = this.propose.selector;
    manifest.executionFunctions[1] = this.enterMarket.selector;
    manifest.executionFunctions[2] = this.approve.selector;
    manifest.executionFunctions[3] = this.deposit.selector;
    manifest.executionFunctions[4] = this.borrow.selector;
    manifest.executionFunctions[5] = this.borrowAtMaturity.selector;
    manifest.executionFunctions[6] = this.withdraw.selector;

    ManifestFunction memory keeperUserOpValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.USER_OP_VALIDATION_KEEPER),
      dependencyIndex: 0
    });
    manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](6);
    manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.enterMarket.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.approve.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.deposit.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrow.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrowAtMaturity.selector,
      associatedFunction: keeperUserOpValidationFunction
    });

    ManifestFunction memory selfRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_SELF),
      dependencyIndex: 0
    });
    ManifestFunction memory keeperRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_KEEPER),
      dependencyIndex: 0
    });
    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](7);
    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.propose.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.enterMarket.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.approve.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.deposit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrow.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.borrowAtMaturity.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[6] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });

    ManifestFunction memory proposedValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.PRE_EXEC_VALIDATION_PROPOSED),
      dependencyIndex: 0
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
  function pluginMetadata() external pure virtual override returns (PluginMetadata memory metadata) {
    metadata.name = NAME;
    metadata.version = VERSION;
    metadata.author = AUTHOR;
  }

  function checkIsMarket(IMarket market) public view {
    if (!isMarket(market)) revert NotMarket();
  }

  function isMarket(IMarket market) internal view returns (bool isMarket_) {
    (,,, isMarket_,) = AUDITOR.markets(market);
  }

  modifier onlyMarket(IMarket market) {
    checkIsMarket(market);
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return interfaceId == type(IExaAccount).interfaceId || super.supportsInterface(interfaceId);
  }
}

struct Proposal {
  uint256 amount;
  IMarket market;
  address receiver;
  uint256 timestamp;
}

enum FunctionId {
  RUNTIME_VALIDATION_SELF,
  RUNTIME_VALIDATION_KEEPER,
  USER_OP_VALIDATION_KEEPER,
  PRE_EXEC_VALIDATION_PROPOSED
}

error ZeroAddress();
