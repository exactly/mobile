// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.23;

import { LightAccount, IEntryPoint } from "light-account/LightAccount.sol";

contract Account is LightAccount {
  constructor(IEntryPoint anEntryPoint) LightAccount(anEntryPoint) { }
}
