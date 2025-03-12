import { decodeAbiParameters } from "viem";

enum ProposalType {
  None,
  BorrowAtMaturity,
  CrossRepayAtMaturity,
  Redeem,
  RepayAtMaturity,
  RollDebt,
  Swap,
  Withdraw,
}
export default ProposalType;

export function decodeCrossRepayAtMaturity(data: `0x${string}`) {
  return decodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "maturity", type: "uint256" },
          { name: "positionAssets", type: "uint256" },
          { name: "maxRepay", type: "uint256" },
          { name: "route", type: "bytes" },
        ],
      },
    ],
    data,
  )[0];
}

export function decodeRepayAtMaturity(data: `0x${string}`) {
  return decodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "maturity", type: "uint256" },
          { name: "positionAssets", type: "uint256" },
        ],
      },
    ],
    data,
  )[0];
}

export function decodeWithdraw(data: `0x${string}`) {
  return decodeAbiParameters([{ type: "address" }], data)[0];
}
