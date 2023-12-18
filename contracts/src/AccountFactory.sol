// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { IEntryPoint } from "account-abstraction/interfaces/IEntryPoint.sol";

import { Account, Auditor } from "./Account.sol";

contract AccountFactory {
  Account public immutable ACCOUNT_IMPLEMENTATION;

  constructor(IEntryPoint anEntryPoint, Auditor auditor) {
    ACCOUNT_IMPLEMENTATION = new Account(anEntryPoint, auditor);
  }

  function createAccount(address owner, uint256 salt) public returns (Account ret) {
    address addr = getAddress(owner, salt);
    uint256 codeSize = addr.code.length;
    if (codeSize > 0) {
      return Account(payable(addr));
    }
    ret = Account(
      payable(
        new ERC1967Proxy{ salt: bytes32(salt) }(
          address(ACCOUNT_IMPLEMENTATION), abi.encodeCall(Account.initialize, (owner))
        )
      )
    );
  }

  // slither-disable-next-line too-many-digits
  function getAddress(address owner, uint256 salt) public view returns (address) {
    return Create2.computeAddress(
      bytes32(salt),
      keccak256(
        abi.encodePacked(
          type(ERC1967Proxy).creationCode,
          abi.encode(address(ACCOUNT_IMPLEMENTATION), abi.encodeCall(Account.initialize, (owner)))
        )
      )
    );
  }
}
