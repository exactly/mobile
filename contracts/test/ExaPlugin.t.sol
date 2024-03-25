// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.25; // solhint-disable-line one-contract-per-file

import { Test, StdStorage, stdStorage } from "forge-std/Test.sol";

import { UpgradeableModularAccount } from "@alchemy/modular-account/account/UpgradeableModularAccount.sol";
import { IEntryPoint } from "@alchemy/modular-account/interfaces/erc4337/IEntryPoint.sol";
import { UserOperation } from "@alchemy/modular-account/interfaces/erc4337/UserOperation.sol";
import { EntryPoint } from "@eth-infinitism/account-abstraction/core/EntryPoint.sol";
import { MultiOwnerPlugin } from "@alchemy/modular-account/plugins/owner/MultiOwnerPlugin.sol";
import { IMultiOwnerPlugin } from "@alchemy/modular-account/plugins/owner/IMultiOwnerPlugin.sol";
import { MultiOwnerModularAccountFactory } from "@alchemy/modular-account/factory/MultiOwnerModularAccountFactory.sol";
import { FunctionReference } from "@alchemy/modular-account/interfaces/IPluginManager.sol";
import { FunctionReferenceLib } from "@alchemy/modular-account/helpers/FunctionReferenceLib.sol";

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { InterestRateModel } from "@exactly/protocol/InterestRateModel.sol";
import { Market, ERC20, ERC4626 } from "@exactly/protocol/Market.sol";
import { MockBalancerVault } from "@exactly/protocol/mocks/MockBalancerVault.sol";
import { MockInterestRateModel } from "@exactly/protocol/mocks/MockInterestRateModel.sol";
import { MockPriceFeed } from "@exactly/protocol/mocks/MockPriceFeed.sol";
import { DebtManager, IPermit2, IBalancerVault } from "@exactly/protocol/periphery/DebtManager.sol";

import { IERC1271 } from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import { MockERC20 } from "solmate/src/test/utils/mocks/MockERC20.sol";

import { ExaPlugin, Auditor, Market } from "../src/ExaPlugin.sol";

contract ExaPluginTest is Test {
  using stdStorage for StdStorage;
  using ECDSA for bytes32;

  address public owner1;
  uint256 public owner1Key;
  address public keeper1;
  uint256 public keeper1Key;
  address[] public owners;
  address payable public beneficiary;
  UpgradeableModularAccount public account1;
  IEntryPoint public entryPoint;
  ExaPlugin exaPlugin;

  Auditor public auditor;
  Market public market;
  MockERC20 public asset;
  DebtManager public debtManager;

  function setUp() external {
    auditor = Auditor(address(new ERC1967Proxy(address(new Auditor(18)), "")));
    auditor.initialize(Auditor.LiquidationIncentive(0.09e18, 0.01e18));
    vm.label(address(auditor), "Auditor");
    InterestRateModel irm = InterestRateModel(address(new MockInterestRateModel(0.1e18)));
    asset = new MockERC20("EXA", "EXA", 18);
    vm.label(address(asset), "EXA");
    market = Market(address(new ERC1967Proxy(address(new Market(asset, auditor)), "")));
    market.initialize(3, 1e18, irm, 0.02e18 / uint256(1 days), 1e17, 0, 0.0046e18, 0.4e18);
    vm.label(address(market), "MarketEXA");
    auditor.enableMarket(market, new MockPriceFeed(18, 1e18), 0.8e18);

    IBalancerVault balancer = IBalancerVault(address(new MockBalancerVault()));
    asset.mint(address(balancer), 1_000_000e18);
    debtManager =
      DebtManager(address(new ERC1967Proxy(address(new DebtManager(auditor, IPermit2(address(0)), balancer)), "")));
    debtManager.initialize();
    vm.label(address(debtManager), "DebtManager");

    entryPoint = IEntryPoint(address(new EntryPoint()));
    MultiOwnerPlugin multiOwnerPlugin = new MultiOwnerPlugin();
    MultiOwnerModularAccountFactory factory = new MultiOwnerModularAccountFactory(
      address(this),
      address(multiOwnerPlugin),
      address(new UpgradeableModularAccount(entryPoint)),
      keccak256(abi.encode(multiOwnerPlugin.pluginManifest())),
      entryPoint
    );
    beneficiary = payable(makeAddr("beneficiary"));
    (owner1, owner1Key) = makeAddrAndKey("owner1");
    owners = new address[](1);
    owners[0] = owner1;
    account1 = UpgradeableModularAccount(payable(factory.createAccount(0, owners)));
    vm.deal(address(account1), 100 ether);
    vm.label(address(account1), "account1");

    (keeper1, keeper1Key) = makeAddrAndKey("keeper1");
    vm.label(keeper1, "keeper1");

    exaPlugin = new ExaPlugin(auditor);

    exaPlugin.grantRole(exaPlugin.KEEPER_ROLE(), keeper1);
    bytes32 manifestHash = keccak256(abi.encode(exaPlugin.pluginManifest()));

    FunctionReference[] memory dependencies = new FunctionReference[](1);
    dependencies[0] =
      FunctionReferenceLib.pack(address(multiOwnerPlugin), uint8(IMultiOwnerPlugin.FunctionId.USER_OP_VALIDATION_OWNER));

    vm.prank(owner1);
    account1.installPlugin({
      plugin: address(exaPlugin),
      manifestHash: manifestHash,
      pluginInstallData: "0x",
      dependencies: dependencies
    });

    asset.mint(address(account1), 1000e18);
  }

  function testEnterMarketSuccess() external {
    vm.prank(keeper1);
    exaPlugin.enterMarket(account1, market);

    assertEq(auditor.accountMarkets(address(account1)), 1);
  }

  function testEnterMarketNotKeeper() external {
    vm.expectRevert(
      abi.encodePacked(
        "AccessControl: account ",
        Strings.toHexString(address(this)),
        " is missing role ",
        Strings.toHexString(uint256(exaPlugin.KEEPER_ROLE()), 32)
      )
    );
    exaPlugin.enterMarket(account1, market);
  }

  function testDepositSuccess() external {
    vm.startPrank(keeper1);
    exaPlugin.approve(account1, market, 100 ether);
    exaPlugin.deposit(account1, market, 100 ether);

    assertEq(market.maxWithdraw(address(account1)), 100 ether);
  }

  function testDepositNotKeeper() external {
    vm.prank(keeper1);
    exaPlugin.approve(account1, market, 100 ether);

    vm.expectRevert(
      abi.encodePacked(
        "AccessControl: account ",
        Strings.toHexString(address(this)),
        " is missing role ",
        Strings.toHexString(uint256(exaPlugin.KEEPER_ROLE()), 32)
      )
    );
    exaPlugin.deposit(account1, market, 100 ether);
  }

  function _getUnsignedOp(UpgradeableModularAccount account, bytes memory callData)
    internal
    view
    returns (UserOperation memory)
  {
    return UserOperation({
      sender: address(account),
      nonce: account.getNonce(),
      initCode: "",
      callData: callData,
      callGasLimit: 1 << 24,
      verificationGasLimit: 1 << 24,
      preVerificationGas: 1 << 24,
      maxFeePerGas: 1 << 8,
      maxPriorityFeePerGas: 1 << 8,
      paymasterAndData: "",
      signature: ""
    });
  }

  function _getSignedOp(UpgradeableModularAccount account, bytes memory callData, uint256 privateKey)
    internal
    view
    returns (UserOperation memory)
  {
    UserOperation memory op = _getUnsignedOp(account, callData);
    op.signature = _sign(privateKey, entryPoint.getUserOpHash(op).toEthSignedMessageHash());
    return op;
  }

  function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
    return abi.encodePacked(r, s, v);
  }
}
