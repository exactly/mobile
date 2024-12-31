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
  address public prevIssuer;
  uint256 public prevIssuerTimestamp;
  uint256 public prevIssuerWindow;
  mapping(address account => bytes32 hash) public issuerOperations;
  uint256 public operationExpiry;

  constructor(address owner, address issuer_, uint256 operationExpiry_, uint256 prevIssuerWindow_) {
    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _setIssuer(issuer_);
    _setOperationExpiry(operationExpiry_);
    _setPrevIssuerWindow(prevIssuerWindow_);
  }

  function checkIssuer(address account, uint256 amount, uint256 timestamp, bytes calldata signature) external {
    if (timestamp > block.timestamp + 1 minutes) revert Timelocked();
    if (timestamp + OPERATION_EXPIRY < block.timestamp) revert Expired();

    bytes32 hash = keccak256(abi.encode(amount, timestamp));
    if (issuerOperations[account] == hash) revert Expired();

    address recovered = _hashTypedData(
      keccak256(
        abi.encode(keccak256("Operation(address account,uint256 amount,uint40 timestamp)"), account, amount, timestamp)
      )
    ).recoverCalldata(signature);

    if (recovered == issuer || (recovered == prevIssuer && block.timestamp <= prevIssuerWindow + prevIssuerTimestamp)) {
      issuerOperations[account] = hash;
      return;
    }

    revert Unauthorized();
  }

  function setIssuer(address issuer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setIssuer(issuer_);
  }

  function setOperationExpiry(uint256 operationExpiry_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setOperationExpiry(operationExpiry_);
  }

  function setPrevIssuerWindow(uint256 prevIssuerWindow_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setPrevIssuerWindow(prevIssuerWindow_);
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
    prevIssuer = issuer;
    prevIssuerTimestamp = block.timestamp;
    issuer = issuer_;
    emit IssuerSet(issuer_, msg.sender);
  }

  function _setOperationExpiry(uint256 operationExpiry_) internal {
    if (operationExpiry_ == 0) revert InvalidOperationExpiry();
    operationExpiry = operationExpiry_;
    emit OperationExpirySet(operationExpiry_, msg.sender);
  }

  function _setPrevIssuerWindow(uint256 prevIssuerWindow_) internal {
    prevIssuerWindow = prevIssuerWindow_;
    emit PrevIssuerWindowSet(prevIssuerWindow_, msg.sender);
  }
}

event IssuerSet(address indexed issuer, address indexed account);

event OperationExpirySet(uint256 operationExpiry, address indexed account);

event PrevIssuerWindowSet(uint256 prevIssuerWindow, address indexed account);

error Expired();
error InvalidOperationExpiry();
error Timelocked();
error Unauthorized();
error ZeroAddress();
