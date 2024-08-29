// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import { IERC4626 } from "openzeppelin-contracts/contracts/interfaces/IERC4626.sol";

import { SafeERC20 } from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import { Address } from "openzeppelin-contracts/contracts/utils/Address.sol";

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
import { EIP712 } from "solady/utils/EIP712.sol";
import { FixedPointMathLib } from "solady/utils/FixedPointMathLib.sol";
import { SafeCastLib } from "solady/utils/SafeCastLib.sol";

import {
  Expired,
  FixedPosition,
  IAuditor,
  IExaAccount,
  IMarket,
  NoBalance,
  NoProposal,
  NotMarket,
  Proposal,
  Proposed,
  Timelocked,
  Unauthorized
} from "./IExaAccount.sol";

/// @title Exa Plugin
/// @author Exactly
contract ExaPlugin is AccessControl, BasePlugin, EIP712, IExaAccount {
  using FixedPointMathLib for uint256;
  using SafeCastLib for int256;
  using SafeERC20 for IERC20;
  using Address for address;
  using ECDSA for bytes32;

  string public constant NAME = "Exa Plugin";
  string public constant VERSION = "0.0.1";
  string public constant AUTHOR = "Exactly";

  bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

  IAuditor public immutable AUDITOR;
  IMarket public immutable EXA_USDC;
  IBalancerVault public immutable BALANCER_VAULT;
  uint256 public immutable INTERVAL = 30 days;
  uint256 public immutable PROPOSAL_DELAY = 5 minutes;
  uint256 public immutable OPERATION_EXPIRY = 15 minutes;

  address public issuer;
  address public collector;
  mapping(address account => bytes32 hash) public issuerOperations;
  mapping(address account => Proposal lastProposal) public proposals;

  constructor(IAuditor auditor, IMarket exaUSDC, IBalancerVault balancerVault, address issuer_, address collector_) {
    AUDITOR = auditor;
    EXA_USDC = exaUSDC;
    BALANCER_VAULT = balancerVault;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    setIssuer(issuer_);
    setCollector(collector_);

    IERC20(EXA_USDC.asset()).forceApprove(address(EXA_USDC), type(uint256).max);
  }

  function propose(IMarket market, uint256 amount, address receiver) external onlyMarket(market) {
    proposals[msg.sender] = Proposal({ amount: amount, market: market, timestamp: block.timestamp, receiver: receiver });
    emit Proposed(msg.sender, market, receiver, amount);
  }

  function repay(uint256 maturity) external {
    IERC20[] memory tokens = new IERC20[](1);
    tokens[0] = IERC20(EXA_USDC.asset());

    uint256[] memory amounts = new uint256[](1);
    FixedPosition memory position = EXA_USDC.fixedBorrowPositions(maturity, msg.sender);
    amounts[0] = position.principal + position.fee;

    bytes[] memory calls = new bytes[](2);
    calls[0] = abi.encodeCall(IMarket.repayAtMaturity, (maturity, amounts[0], type(uint256).max, msg.sender)); // TODO slippage control
    calls[1] = abi.encodeCall(IERC4626.withdraw, (amounts[0], address(BALANCER_VAULT), msg.sender));

    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC20.approve, (address(this), EXA_USDC.previewWithdraw(amounts[0])))
    );
    BALANCER_VAULT.flashLoan(address(this), tokens, amounts, abi.encode(EXA_USDC, calls));
  }

  function collectCredit(uint256 maturity, uint256 amount, uint256 timestamp, bytes calldata signature)
    external
    onlyIssuer(amount, timestamp, signature)
  {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC),
      0,
      abi.encodeCall(IMarket.borrowAtMaturity, (maturity, amount, type(uint256).max, collector, msg.sender)) // TODO slippage control
    );
  }

  function collectDebit(uint256 amount, uint256 timestamp, bytes calldata signature)
    external
    onlyIssuer(amount, timestamp, signature)
  {
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(EXA_USDC), 0, abi.encodeCall(IERC4626.withdraw, (amount, collector, msg.sender))
    );
  }

  function poke(IMarket market) external onlyMarket(market) {
    uint256 balance = IERC20(market.asset()).balanceOf(msg.sender);
    // slither-disable-next-line incorrect-equality -- unsigned zero check
    if (balance == 0) revert NoBalance();

    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market.asset()), 0, abi.encodeCall(IERC20.approve, (address(market), balance))
    );
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(market), 0, abi.encodeCall(IERC4626.deposit, (balance, msg.sender))
    );
    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      address(AUDITOR), 0, abi.encodeCall(IAuditor.enterMarket, (market))
    );
  }

  function withdraw() external {
    Proposal storage proposal = proposals[msg.sender];
    address market = address(proposal.market);
    if (market == address(0)) revert NoProposal();

    // slither-disable-next-line unused-return -- unneeded
    IPluginExecutor(msg.sender).executeFromPluginExternal(
      market, 0, abi.encodeCall(IERC4626.withdraw, (proposal.amount, proposal.receiver, msg.sender))
    );
  }

  function setIssuer(address issuer_) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (issuer_ == address(0)) revert ZeroAddress();
    issuer = issuer_;
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
      if (msg.sender != sender) revert Unauthorized();
      return;
    }
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_KEEPER)) {
      if (!hasRole(KEEPER_ROLE, sender)) revert Unauthorized();
      return;
    }
    if (functionId == uint8(FunctionId.RUNTIME_VALIDATION_BALANCER)) {
      if (msg.sender != address(BALANCER_VAULT)) revert Unauthorized();
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
      if (!_isMarket(target)) return "";

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

      if (receiver == collector) return "";

      Proposal memory proposal = proposals[owner];

      // slither-disable-next-line incorrect-equality -- unsigned zero check
      if (proposal.amount == 0) revert NoProposal();
      if (proposal.amount < assets) revert NoProposal();
      if (proposal.market != target) revert NoProposal();
      if (proposal.receiver != receiver) revert NoProposal();
      if (proposal.timestamp + PROPOSAL_DELAY > block.timestamp) revert Timelocked();
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
  function onInstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function onUninstall(bytes calldata) external override { } // solhint-disable-line no-empty-blocks

  /// @inheritdoc BasePlugin
  function pluginManifest() external pure override returns (PluginManifest memory manifest) {
    manifest.executionFunctions = new bytes4[](7);
    manifest.executionFunctions[0] = this.propose.selector;
    manifest.executionFunctions[1] = this.repay.selector;
    manifest.executionFunctions[2] = this.collectCredit.selector;
    manifest.executionFunctions[3] = this.collectDebit.selector;
    manifest.executionFunctions[4] = this.poke.selector;
    manifest.executionFunctions[5] = this.withdraw.selector;
    manifest.executionFunctions[6] = this.receiveFlashLoan.selector;

    ManifestFunction memory keeperUserOpValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.USER_OP_VALIDATION_KEEPER),
      dependencyIndex: 0
    });
    manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](4);
    manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectCredit.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectDebit.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.poke.selector,
      associatedFunction: keeperUserOpValidationFunction
    });
    manifest.userOpValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
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
    ManifestFunction memory balancerRuntimeValidationFunction = ManifestFunction({
      functionType: ManifestAssociatedFunctionType.SELF,
      functionId: uint8(FunctionId.RUNTIME_VALIDATION_BALANCER),
      dependencyIndex: 0
    });
    manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](7);
    manifest.runtimeValidationFunctions[0] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.propose.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[1] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.repay.selector,
      associatedFunction: selfRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[2] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectCredit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[3] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.collectDebit.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[4] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.poke.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[5] = ManifestAssociatedFunction({
      executionSelector: IExaAccount.withdraw.selector,
      associatedFunction: keeperRuntimeValidationFunction
    });
    manifest.runtimeValidationFunctions[6] = ManifestAssociatedFunction({
      executionSelector: this.receiveFlashLoan.selector,
      associatedFunction: balancerRuntimeValidationFunction
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

  function receiveFlashLoan(IERC20[] memory, uint256[] memory, uint256[] memory, bytes memory userData) external {
    assert(msg.sender == address(BALANCER_VAULT)); // TODO check call hash

    (IMarket market, bytes[] memory calls) = abi.decode(userData, (IMarket, bytes[]));
    _checkMarket(market);
    for (uint256 i = 0; i < calls.length; ++i) {
      // slither-disable-next-line unused-return -- unneeded
      address(market).functionCall(calls[i]);
    }
  }

  function _checkMarket(IMarket market) public view {
    if (!_isMarket(market)) revert NotMarket();
  }

  function _checkIssuer(uint256 amount, uint256 timestamp, bytes calldata signature) internal {
    if (timestamp > block.timestamp + 1 minutes) revert Timelocked();
    if (timestamp + OPERATION_EXPIRY < block.timestamp) revert Expired();

    bytes32 hash = keccak256(abi.encode(amount, timestamp));
    if (issuerOperations[msg.sender] == hash) revert Expired();

    if (
      _hashTypedData(
        keccak256(
          abi.encode(
            keccak256("Operation(address account,uint256 amount,uint40 timestamp)"), msg.sender, amount, timestamp
          )
        )
      ).recoverCalldata(signature) != issuer
    ) revert Unauthorized();

    issuerOperations[msg.sender] = hash;
  }

  function _isMarket(IMarket market) internal view returns (bool isMarket_) {
    // slither-disable-next-line unused-return -- unneeded
    (,,, isMarket_,) = AUDITOR.markets(market);
  }

  modifier onlyMarket(IMarket market) {
    _checkMarket(market);
    _;
  }

  modifier onlyIssuer(uint256 amount, uint256 timestamp, bytes calldata signature) {
    _checkIssuer(amount, timestamp, signature);
    _;
  }

  // solhint-disable-next-line func-name-mixedcase
  function DOMAIN_SEPARATOR() public view returns (bytes32) {
    return _domainSeparator();
  }

  function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
    name = NAME;
    version = VERSION;
  }

  function supportsInterface(bytes4 interfaceId) public view override(AccessControl, BasePlugin) returns (bool) {
    return interfaceId == type(IExaAccount).interfaceId || super.supportsInterface(interfaceId);
  }
}

enum FunctionId {
  RUNTIME_VALIDATION_SELF,
  RUNTIME_VALIDATION_KEEPER,
  RUNTIME_VALIDATION_BALANCER,
  USER_OP_VALIDATION_KEEPER,
  PRE_EXEC_VALIDATION_PROPOSED
}

error ZeroAddress();

interface IBalancerVault {
  function flashLoan(address recipient, IERC20[] memory tokens, uint256[] memory amounts, bytes memory userData)
    external;
}
