// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23; // solhint-disable-line one-contract-per-file

import { Test, StdStorage, stdStorage } from "forge-std/Test.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { InterestRateModel } from "@exactly/protocol/InterestRateModel.sol";
import { Market, ERC20, ERC4626 } from "@exactly/protocol/Market.sol";
import { MockInterestRateModel } from "@exactly/protocol/mocks/MockInterestRateModel.sol";
import { MockPriceFeed } from "@exactly/protocol/mocks/MockPriceFeed.sol";

import { IERC1271 } from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import { EntryPoint } from "account-abstraction/core/EntryPoint.sol";
import { IEntryPoint } from "account-abstraction/interfaces/IEntryPoint.sol";
import { UserOperation } from "account-abstraction/interfaces/UserOperation.sol";
import { SimpleAccount } from "account-abstraction/samples/SimpleAccount.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { Account as A, LightAccount } from "../src/Account.sol";
import { AccountFactory } from "../src/AccountFactory.sol";

contract AccountTest is Test {
  using stdStorage for StdStorage;
  using ECDSA for bytes32;

  uint256 public constant EOA_PRIVATE_KEY = 1;
  uint256 public constant KEEPER_PRIVATE_KEY = 2;
  address payable public constant BENEFICIARY = payable(address(0xbe9ef1c1a2ee));
  address public eoaAddress;
  A public account;
  A public contractOwnedAccount;
  EntryPoint public entryPoint;
  LightSwitch public lightSwitch;
  Owner public contractOwner;

  Auditor public auditor;
  Market public market;
  MockERC20 public asset;

  function setUp() external {
    auditor = Auditor(address(new ERC1967Proxy(address(new Auditor(18)), "")));
    auditor.initialize(Auditor.LiquidationIncentive(0.09e18, 0.01e18));
    vm.label(address(auditor), "Auditor");
    InterestRateModel irm = InterestRateModel(address(new MockInterestRateModel(0.1e18)));
    asset = new MockERC20("EXA", "EXA", 18);
    market = Market(address(new ERC1967Proxy(address(new Market(asset, auditor)), "")));
    market.initialize(3, 1e18, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(market), "MarketEXA");
    auditor.enableMarket(market, new MockPriceFeed(18, 1e18), 0.8e18);

    eoaAddress = vm.addr(EOA_PRIVATE_KEY);
    entryPoint = new EntryPoint();
    AccountFactory factory = new AccountFactory(entryPoint, auditor);
    account = factory.createAccount(eoaAddress, 1);
    vm.deal(address(account), 1 << 128);
    lightSwitch = new LightSwitch();
    contractOwner = new Owner();

    asset.mint(address(account), 1000e18);
  }

  function testExecuteCanBeCalledByOwner() external {
    vm.prank(eoaAddress);
    account.execute(address(lightSwitch), 0, abi.encodeCall(LightSwitch.turnOn, ()));
    assertTrue(lightSwitch.on());
  }

  function testExecuteWithValueCanBeCalledByOwner() external {
    vm.prank(eoaAddress);
    account.execute(address(lightSwitch), 1 ether, abi.encodeCall(LightSwitch.turnOn, ()));
    assertTrue(lightSwitch.on());
    assertEq(address(lightSwitch).balance, 1 ether);
  }

  function testExecuteCanBeCalledByEntryPointWithExternalOwner() external {
    UserOperation memory op =
      _getSignedOp(address(lightSwitch), abi.encodeCall(LightSwitch.turnOn, ()), EOA_PRIVATE_KEY);
    UserOperation[] memory ops = new UserOperation[](1);
    ops[0] = op;
    entryPoint.handleOps(ops, BENEFICIARY);
    assertTrue(lightSwitch.on());
  }

  function testExecuteCanBeCalledByEntryPointWithKeeper() external {
    UserOperation memory op =
      _getSignedOp(address(auditor), abi.encodeCall(Auditor.enterMarket, (market)), KEEPER_PRIVATE_KEY);
    UserOperation[] memory ops = new UserOperation[](1);
    ops[0] = op;
    entryPoint.handleOps(ops, BENEFICIARY);
    assertEq(auditor.accountMarkets(address(account)), 1);

    ops[0] = _getSignedOp(address(asset), abi.encodeCall(ERC20.approve, (address(market), 1)), KEEPER_PRIVATE_KEY);
    entryPoint.handleOps(ops, BENEFICIARY);
    ops[0] = _getSignedOp(address(market), abi.encodeCall(ERC4626.deposit, (1, address(account))), KEEPER_PRIVATE_KEY);
    entryPoint.handleOps(ops, BENEFICIARY);
    assertEq(market.maxWithdraw(address(account)), 1);

    ops = new UserOperation[](1);
    ops[0] = _getSignedOp(address(market), abi.encodeCall(ERC4626.deposit, (1, address(this))), KEEPER_PRIVATE_KEY);
    vm.expectRevert(abi.encodeWithSelector(IEntryPoint.FailedOp.selector, 0, "AA24 signature error"));
    entryPoint.handleOps(ops, BENEFICIARY);

    ops[0] = _getSignedOp(address(lightSwitch), abi.encodeCall(LightSwitch.turnOn, ()), KEEPER_PRIVATE_KEY);
    vm.expectRevert(abi.encodeWithSelector(IEntryPoint.FailedOp.selector, 0, "AA24 signature error"));
    entryPoint.handleOps(ops, BENEFICIARY);
  }

  function testExecutedCanBeCalledByEntryPointWithContractOwner() external {
    _useContractOwner();
    UserOperation memory op = _getUnsignedOp(address(lightSwitch), abi.encodeCall(LightSwitch.turnOn, ()));
    op.signature = contractOwner.sign(entryPoint.getUserOpHash(op));
    UserOperation[] memory ops = new UserOperation[](1);
    ops[0] = op;
    entryPoint.handleOps(ops, BENEFICIARY);
    assertTrue(lightSwitch.on());
  }

  function testRejectsUserOpsWithInvalidSignature() external {
    UserOperation memory op = _getSignedOp(address(lightSwitch), abi.encodeCall(LightSwitch.turnOn, ()), 1234);
    UserOperation[] memory ops = new UserOperation[](1);
    ops[0] = op;
    vm.expectRevert(abi.encodeWithSelector(IEntryPoint.FailedOp.selector, 0, "AA24 signature error"));
    entryPoint.handleOps(ops, BENEFICIARY);
  }

  function testExecuteCannotBeCalledByRandos() external {
    vm.expectRevert(abi.encodeWithSelector(LightAccount.NotAuthorized.selector, (address(this))));
    account.execute(address(lightSwitch), 0, abi.encodeCall(LightSwitch.turnOn, ()));
  }

  function testExecuteRevertingCallShouldRevertWithSameData() external {
    Reverter reverter = new Reverter();
    vm.prank(eoaAddress);
    vm.expectRevert("did revert");
    account.execute(address(reverter), 0, abi.encodeCall(Reverter.doRevert, ()));
  }

  function testExecuteBatchCalledByOwner() external {
    vm.prank(eoaAddress);
    address[] memory dest = new address[](1);
    dest[0] = address(lightSwitch);
    bytes[] memory func = new bytes[](1);
    func[0] = abi.encodeCall(LightSwitch.turnOn, ());
    account.executeBatch(dest, func);
    assertTrue(lightSwitch.on());
  }

  function testExecuteBatchFailsForUnevenInputArrays() external {
    vm.prank(eoaAddress);
    address[] memory dest = new address[](2);
    dest[0] = address(lightSwitch);
    dest[1] = address(lightSwitch);
    bytes[] memory func = new bytes[](1);
    func[0] = abi.encodeCall(LightSwitch.turnOn, ());
    vm.expectRevert(LightAccount.ArrayLengthMismatch.selector);
    account.executeBatch(dest, func);
  }

  function testExecuteBatchWithValueCalledByOwner() external {
    vm.prank(eoaAddress);
    address[] memory dest = new address[](1);
    dest[0] = address(lightSwitch);
    uint256[] memory value = new uint256[](1);
    value[0] = uint256(1);
    bytes[] memory func = new bytes[](1);
    func[0] = abi.encodeCall(LightSwitch.turnOn, ());
    account.executeBatch(dest, value, func);
    assertTrue(lightSwitch.on());
    assertEq(address(lightSwitch).balance, 1);
  }

  function testExecuteBatchWithValueFailsForUnevenInputArrays() external {
    vm.prank(eoaAddress);
    address[] memory dest = new address[](1);
    dest[0] = address(lightSwitch);
    uint256[] memory value = new uint256[](2);
    value[0] = uint256(1);
    value[1] = uint256(1 ether);
    bytes[] memory func = new bytes[](1);
    func[0] = abi.encodeCall(LightSwitch.turnOn, ());
    vm.expectRevert(LightAccount.ArrayLengthMismatch.selector);
    account.executeBatch(dest, value, func);
  }

  function testInitialize() external {
    AccountFactory factory = new AccountFactory(entryPoint, auditor);
    vm.expectEmit(true, false, false, false);
    emit Initialized(0);
    account = factory.createAccount(eoaAddress, 1);
  }

  function testCannotInitializeWithZeroOwner() external {
    AccountFactory factory = new AccountFactory(entryPoint, auditor);
    vm.expectRevert(abi.encodeWithSelector(LightAccount.InvalidOwner.selector, (address(0))));
    account = factory.createAccount(address(0), 1);
  }

  function testAddDeposit() external {
    assertEq(account.getDeposit(), 0);
    account.addDeposit{ value: 10 }();
    assertEq(account.getDeposit(), 10);
    assertEq(account.getDeposit(), entryPoint.balanceOf(address(account)));
  }

  function testWithdrawDepositToCalledByOwner() external {
    account.addDeposit{ value: 10 }();
    vm.prank(eoaAddress);
    account.withdrawDepositTo(BENEFICIARY, 5);
    assertEq(entryPoint.balanceOf(address(account)), 5);
  }

  function testWithdrawDepositToCannotBeCalledByRandos() external {
    account.addDeposit{ value: 10 }();
    vm.expectRevert(abi.encodeWithSelector(LightAccount.NotAuthorized.selector, (address(this))));
    account.withdrawDepositTo(BENEFICIARY, 5);
  }

  function testOwnerCanTransferOwnership() external {
    address newOwner = address(0x100);
    vm.prank(eoaAddress);
    vm.expectEmit(true, true, false, false);
    emit OwnershipTransferred(eoaAddress, newOwner);
    account.transferOwnership(newOwner);
    assertEq(account.owner(), newOwner);
  }

  function testEntryPointCanTransferOwnership() external {
    address newOwner = address(0x100);
    UserOperation memory op =
      _getSignedOp(address(account), abi.encodeCall(LightAccount.transferOwnership, (newOwner)), EOA_PRIVATE_KEY);
    UserOperation[] memory ops = new UserOperation[](1);
    ops[0] = op;
    vm.expectEmit(true, true, false, false);
    emit OwnershipTransferred(eoaAddress, newOwner);
    entryPoint.handleOps(ops, BENEFICIARY);
    assertEq(account.owner(), newOwner);
  }

  function testRandosCannotTransferOwnership() external {
    vm.expectRevert(abi.encodeWithSelector(LightAccount.NotAuthorized.selector, (address(this))));
    account.transferOwnership(address(0x100));
  }

  function testCannotTransferOwnershipToCurrentOwner() external {
    vm.prank(eoaAddress);
    vm.expectRevert(abi.encodeWithSelector(LightAccount.InvalidOwner.selector, (eoaAddress)));
    account.transferOwnership(eoaAddress);
  }

  function testCannotTransferOwnershipToZero() external {
    vm.prank(eoaAddress);
    vm.expectRevert(abi.encodeWithSelector(LightAccount.InvalidOwner.selector, (address(0))));
    account.transferOwnership(address(0));
  }

  function testCannotTransferOwnershipToLightContractItself() external {
    vm.prank(eoaAddress);
    vm.expectRevert(abi.encodeWithSelector(LightAccount.InvalidOwner.selector, (address(account))));
    account.transferOwnership(address(account));
  }

  function testEntryPointGetter() external {
    assertEq(address(account.entryPoint()), address(entryPoint));
  }

  function testIsValidSignatureForEoaOwner() external {
    bytes32 digest = keccak256("digest");
    bytes memory signature = _sign(EOA_PRIVATE_KEY, account.getMessageHash(abi.encode(digest)));
    assertEq(account.isValidSignature(digest, signature), bytes4(keccak256("isValidSignature(bytes32,bytes)")));
  }

  function testIsValidSignatureForContractOwner() external {
    _useContractOwner();
    bytes32 digest = keccak256("digest");
    bytes memory signature = contractOwner.sign(account.getMessageHash(abi.encode(digest)));
    assertEq(account.isValidSignature(digest, signature), bytes4(keccak256("isValidSignature(bytes32,bytes)")));
  }

  function testIsValidSignatureRejectsInvalid() external {
    bytes32 digest = keccak256("digest");
    bytes memory signature = _sign(123, account.getMessageHash(abi.encode(digest)));
    assertEq(account.isValidSignature(digest, signature), bytes4(0xffffffff));
  }

  function testOwnerCanUpgrade() external {
    // Upgrade to a normal SimpleAccount with a different entry point.
    IEntryPoint newEntryPoint = IEntryPoint(address(0x2000));
    SimpleAccount newImplementation = new SimpleAccount(newEntryPoint);
    vm.expectEmit(true, true, false, false);
    emit SimpleAccountInitialized(newEntryPoint, address(this));
    vm.prank(eoaAddress);
    account.upgradeToAndCall(address(newImplementation), abi.encodeCall(SimpleAccount.initialize, (address(this))));
    SimpleAccount upgradedAccount = SimpleAccount(payable(account));
    assertEq(address(upgradedAccount.entryPoint()), address(newEntryPoint));
  }

  function testNonOwnerCannotUpgrade() external {
    // Try to upgrade to a normal SimpleAccount with a different entry point.
    IEntryPoint newEntryPoint = IEntryPoint(address(0x2000));
    SimpleAccount newImplementation = new SimpleAccount(newEntryPoint);
    vm.expectRevert(abi.encodeWithSelector(LightAccount.NotAuthorized.selector, (address(this))));
    account.upgradeToAndCall(address(newImplementation), abi.encodeCall(SimpleAccount.initialize, (address(this))));
  }

  function testStorageSlots() external {
    // No storage at start (slot 0).
    bytes32 storageStart = vm.load(address(account), bytes32(uint256(0)));
    assertEq(storageStart, 0);

    // Instead, storage at the chosen locations.
    bytes32 accountSlot =
      keccak256(abi.encode(uint256(keccak256("light_account_v1.storage")) - 1)) & ~bytes32(uint256(0xff));
    address owner = abi.decode(abi.encode(vm.load(address(account), accountSlot)), (address));
    assertEq(owner, eoaAddress);

    bytes32 initializableSlot =
      keccak256(abi.encode(uint256(keccak256("light_account_v1.initializable")) - 1)) & ~bytes32(uint256(0xff));
    uint8 initialized = abi.decode(abi.encode(vm.load(address(account), initializableSlot)), (uint8));
    assertEq(initialized, 1);
  }

  function _useContractOwner() internal {
    vm.prank(eoaAddress);
    account.transferOwnership(address(contractOwner));
  }

  function _getUnsignedOp(address target, bytes memory innerCallData) internal view returns (UserOperation memory) {
    return UserOperation({
      sender: address(account),
      nonce: account.getNonce(),
      initCode: "",
      callData: abi.encodeCall(LightAccount.execute, (target, 0, innerCallData)),
      callGasLimit: 1 << 24,
      verificationGasLimit: 1 << 24,
      preVerificationGas: 1 << 24,
      maxFeePerGas: 1 << 8,
      maxPriorityFeePerGas: 1 << 8,
      paymasterAndData: "",
      signature: ""
    });
  }

  function _getSignedOp(address target, bytes memory innerCallData, uint256 privateKey)
    internal
    view
    returns (UserOperation memory)
  {
    UserOperation memory op = _getUnsignedOp(target, innerCallData);
    op.signature = _sign(privateKey, entryPoint.getUserOpHash(op).toEthSignedMessageHash());
    return op;
  }

  function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }
}

contract LightSwitch {
  bool public on;

  function turnOn() external payable {
    on = true;
  }
}

contract Reverter {
  function doRevert() external pure {
    revert("did revert"); // solhint-disable-line custom-errors
  }
}

contract Owner is IERC1271 {
  function sign(bytes32 digest) public pure returns (bytes memory) {
    return abi.encodePacked("Signed: ", digest);
  }

  function isValidSignature(bytes32 digest, bytes memory signature) external pure override returns (bytes4) {
    if (keccak256(signature) == keccak256(sign(digest))) {
      return bytes4(keccak256("isValidSignature(bytes32,bytes)"));
    }
    return 0xffffffff;
  }
}

event SimpleAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);

event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

event Initialized(uint64 version);
