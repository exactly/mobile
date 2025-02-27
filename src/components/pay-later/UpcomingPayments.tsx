import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronRight } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import React from "react";
import { Pressable } from "react-native";
import { XStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";
import View from "../shared/View";

export default function UpcomingPayments({ onSelect }: { onSelect: (maturity: bigint, amount: bigint) => void }) {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({ address: previewerAddress, args: [address ?? zeroAddress] });
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
          Upcoming payments
        </Text>
      </View>
      {payments.length > 1 ? (
        payments.slice(1).map(([maturity, amount], index) => (
          <Pressable
            key={index}
            onPress={() => {
              onSelect(maturity, amount);
            }}
          >
            <View flexDirection="row" justifyContent="space-between" alignItems="center">
              <View>
                <Text subHeadline>{format(new Date(Number(maturity) * 1000), "MMM dd, yyyy")}</Text>
              </View>
              <View flexDirection="row" alignItems="center" gap="$s2">
                <XStack alignItems="center" gap="$s2">
                  <Text sensitive emphasized body>
                    {(Number(amount) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                  <ChevronRight size={24} color="$iconBrandDefault" />
                </XStack>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <View>
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            No more fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}
