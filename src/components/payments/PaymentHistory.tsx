import { Check, ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";

import Text from "../shared/Text";
import View from "../shared/View";

interface Payment {
  status: string;
  date: string;
  usdValue: number;
  amount: number;
  asset: string;
}

const payments: Payment[] = [
  {
    status: "Paid",
    date: "11/03/24",
    usdValue: 2499.88,
    amount: 2499.88,
    asset: "USDC",
  },
  {
    status: "Paid",
    date: "08/03/24",
    usdValue: 487,
    amount: 0.1542,
    asset: "ETH",
  },
  {
    status: "Paid",
    date: "21/02/24",
    usdValue: 1049.86,
    amount: 1049.86,
    asset: "USDC",
  },
];

export default function PaymentHistory() {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s4">
      <View flexDirection="row" gap="$s3" alignItems="center" justifyContent="space-between">
        <Text emphasized headline flex={1}>
          Past payments
        </Text>
        <Pressable>
          <View flexDirection="row" gap={2} alignItems="center">
            <Text color="$interactiveTextBrandDefault" emphasized footnote fontWeight="bold">
              View all
            </Text>
            <ChevronRight size={ms(14)} color="$interactiveTextBrandDefault" fontWeight="bold" />
          </View>
        </Pressable>
      </View>

      {payments.map(({ status, date, usdValue, asset, amount }, index) => (
        <View key={index} flexDirection="row" gap={ms(16)} alignItems="center">
          <View
            width={ms(40)}
            height={ms(40)}
            backgroundColor="$backgroundBrandMild"
            borderRadius="$r3"
            justifyContent="center"
            alignItems="center"
          >
            <Check size={ms(20)} color="$uiSuccessPrimary" fontWeight="bold" />
          </View>
          <View flex={1} gap={ms(5)}>
            <View flexDirection="row" justifyContent="space-between" alignItems="center">
              <View gap={ms(5)}>
                <Text fontSize={ms(15)}>{status}</Text>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                  {date}
                </Text>
              </View>
              <View gap={ms(5)}>
                <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                  <Text fontSize={ms(15)} fontWeight="bold">
                    -
                  </Text>
                  <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                    {usdValue.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      currencySign: "standard",
                      currencyDisplay: "symbol",
                    })}
                  </Text>
                </View>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                  {amount.toLocaleString("en-US")} {asset}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}