// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import { Auditor } from "@exactly/protocol/Auditor.sol";
import { Market, ERC20, ERC4626 } from "@exactly/protocol/Market.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { LightAccount, IEntryPoint, UserOperation } from "light-account/LightAccount.sol";

contract Account is LightAccount {
  using ECDSA for bytes32;

  Auditor public immutable AUDITOR;

  constructor(IEntryPoint anEntryPoint, Auditor auditor) LightAccount(anEntryPoint) {
    AUDITOR = auditor;
  }

  function initialize(address anOwner) public override {
    super.initialize(anOwner);
    _accountStorage().keepers[0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF] = true;
  }

  function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal
    view
    override
    returns (uint256 validationData)
  {
    address _owner = owner();
    (address recovered, ECDSA.RecoverError error) = userOpHash.toEthSignedMessageHash().tryRecover(userOp.signature);
    if (
      (
        error == ECDSA.RecoverError.NoError
          && (recovered == _owner || (_isKeep(userOp.callData) && _accountStorage().keepers[recovered]))
      ) || SignatureChecker.isValidERC1271SignatureNow(_owner, userOpHash, userOp.signature)
    ) {
      return 0;
    }
    return SIG_VALIDATION_FAILED;
  }

  function _isKeep(bytes calldata callData) internal view returns (bool) {
    if (bytes4(callData[0:4]) != this.execute.selector) return false;
    address dest = address(bytes20(callData[16:36]));
    bytes4 selector = bytes4(callData[132:136]);

    if (selector == ERC4626.deposit.selector) {
      (, address recipient) = abi.decode(callData[136:], (uint256, address));
      return recipient == address(this) && _isMarket(dest);
    }

    if (selector == ERC20.approve.selector) {
      (address spender,) = abi.decode(callData[136:], (address, uint256));
      return _isMarket(spender);
    }

    if (selector == Auditor.enterMarket.selector) return dest == address(AUDITOR);

    return false;
  }

  function _isMarket(address addr) internal view returns (bool isMarket) {
    (,,, isMarket,) = AUDITOR.markets(Market(addr));
  }

  // keccak256(abi.encode(uint256(keccak256("exactly.storage")) - 1)) & ~bytes32(uint256(0xff));
  bytes32 internal constant _EXA_STORAGE_POSITION = 0xd822a58c37a47c2078742d26aac7abdb5f40ee2b86ef1daebd3317e35ca85100;

  function _accountStorage() internal pure returns (AccountStorage storage storageStruct) {
    bytes32 position = _EXA_STORAGE_POSITION;
    // solhint-disable no-inline-assembly
    // slither-disable-next-line assembly
    assembly ("memory-safe") {
      // solhint-enable no-inline-assembly
      storageStruct.slot := position
    }
  }
}

struct AccountStorage {
  mapping(address => bool) keepers;
}
