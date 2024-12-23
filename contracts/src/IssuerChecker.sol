// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { AccessControl } from "openzeppelin-contracts/contracts/access/AccessControl.sol";

import { ECDSA } from "solady/utils/ECDSA.sol";
import { EIP712 } from "solady/utils/EIP712.sol";

contract IssuerChecker is AccessControl, EIP712 {
  using ECDSA for bytes32;

  string public constant NAME = "IssuerChecker";
  string public constant VERSION = "1";

  uint256 public immutable OPERATION_EXPIRY = 15 minutes;

  address public issuer;
  mapping(address account => bytes32 hash) public issuerOperations;

  constructor(address owner, address issuer_) {
    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _setIssuer(issuer_);
  }

  function checkIssuer(address account, uint256 amount, uint256 timestamp, bytes calldata signature) external {
    if (timestamp > block.timestamp + 1 minutes) revert Timelocked();
    if (timestamp + OPERATION_EXPIRY < block.timestamp) revert Expired();

    bytes32 hash = keccak256(abi.encode(amount, timestamp));
    if (issuerOperations[account] == hash) revert Expired();

    if (
      _hashTypedData(
        keccak256(
          abi.encode(
            keccak256("Operation(address account,uint256 amount,uint40 timestamp)"), account, amount, timestamp
          )
        )
      ).recoverCalldata(signature) != issuer
    ) revert Unauthorized();

    issuerOperations[account] = hash;
  }

  function setIssuer(address issuer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setIssuer(issuer_);
  }

  // solhint-disable-next-line func-name-mixedcase
  function DOMAIN_SEPARATOR() public view returns (bytes32) {
    return _domainSeparator();
  }

  function _domainNameAndVersion() internal pure override returns (string memory name, string memory version) {
    name = NAME;
    version = VERSION;
  }

  function _setIssuer(address issuer_) internal {
    if (issuer_ == address(0)) revert ZeroAddress();
    issuer = issuer_;
    emit IssuerSet(issuer_, msg.sender);
  }
}

event IssuerSet(address indexed issuer, address indexed account);

error Expired();
error Timelocked();
error Unauthorized();
error ZeroAddress();
