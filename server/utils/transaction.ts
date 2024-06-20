import type { Address } from "viem";

import type { AuthorizationRequest, AuthorizationResponse, User } from "./types.js";

function getAddress(userId: User["id"]): Address {
  // TODO implement w/ DB
  return "0x1234567890123456789012345678901234567890";
}

async function borrowUSDCAtMaturity(
  usdAmount: number, //? Should we convert USD to USDC?
  borrower: Address,
  maturity: number,
) {
  // TODO implement
}

function getClosestMaturity(): number {
  return 29_090;
}

export default async function processTransaction({
  amount: { settlement },
  user,
}: AuthorizationRequest): Promise<AuthorizationResponse> {
  if (settlement.currency !== "USD") {
    return {
      message: "Invalid currency",
      status: "REJECTED",
      status_detail: "OTHER",
    };
  }

  try {
    const borrower = getAddress(user.id);
    const maturity = getClosestMaturity();
    await borrowUSDCAtMaturity(settlement.total, borrower, maturity);
    return {
      message: "Success",
      status: "APPROVED",
      status_detail: "APPROVED",
    };
  } catch (error) {
    if (!(error instanceof Error)) {
      return {
        status: "REJECTED",
        status_detail: "SYSTEM_ERROR",
        message: "Unknown error",
      };
    }
    return {
      status: "REJECTED",
      status_detail: "INSUFFICIENT_FUNDS",
      message: error.message,
    };
  }
}
