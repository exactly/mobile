import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronRight } from "@tamagui/lucide-icons";
import { intlFormat } from "date-fns";
import React from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";
import View from "../shared/View";

interface Payment {
  maturity: bigint;
  amount: bigint;
}

export default function UpcomingPayments() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  const duePayments = new Map<bigint, bigint>();
  if (markets) {
    for (const { fixedBorrowPositions, usdPrice, decimals } of markets) {
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
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s6">
      <View flexDirection="row" gap="$s3" alignItems="center" justifyContent="space-between">
        <Text emphasized headline flex={1}>
          Next payments
        </Text>
      </View>

      {payments.length > 0 ? (
        payments.map(([maturity, amount], index) => <ListItem key={index} maturity={maturity} amount={amount} />)
      ) : (
        <View>
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            There are no fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}

function ListItem({ maturity, amount }: Payment) {
  return (
    <View flexDirection="row" justifyContent="space-between" alignItems="center">
      <View>
        <Text>{intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" })}</Text>
      </View>
      <View flexDirection="row" alignItems="center" gap="$s2">
        <View>
          <Text>
            {(Number(amount) / 1e18).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
            })}
          </Text>
        </View>
        <View>
          <ChevronRight size={24} color="$iconBrandDefault" />
        </View>
      </View>
    </View>
  );
}
