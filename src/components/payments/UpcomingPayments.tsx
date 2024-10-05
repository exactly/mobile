import { previewerAddress } from "@exactly/common/generated/chain";
import { intlFormat } from "date-fns";
import React from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";
import View from "../shared/View";

interface Payment {
  amount: bigint;
  maturity: bigint;
}

export default function UpcomingPayments() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
    args: [address ?? zeroAddress],
  });
  const duePayments = new Map<bigint, bigint>();
  if (markets) {
    for (const { decimals, fixedBorrowPositions, usdPrice } of markets) {
      for (const { maturity, previewValue } of fixedBorrowPositions) {
        if (!previewValue) continue;
        duePayments.set(
          maturity,
          (duePayments.get(maturity) ?? 0n) + (previewValue * usdPrice) / 10n ** BigInt(decimals),
        );
      }
    }
  }
  const payments = [...duePayments];
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" gap="$s6" padding="$s4">
      <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-between">
        <Text emphasized flex={1} headline>
          Next payments
        </Text>
      </View>
      {payments.length > 0 ? (
        payments.map(([maturity, amount], index) => <ListItem amount={amount} key={index} maturity={maturity} />)
      ) : (
        <View>
          <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
            There are no fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}

function ListItem({ amount, maturity }: Payment) {
  return (
    <View alignItems="center" flexDirection="row" justifyContent="space-between">
      <View>
        <Text>{intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" })}</Text>
      </View>
      <View alignItems="center" flexDirection="row" gap="$s2">
        <View>
          <Text sensitive>
            {(Number(amount) / 1e18).toLocaleString(undefined, {
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              style: "currency",
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
