import { Check, ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";

import Text from "../shared/Text";
import View from "../shared/View";

// TODO remove once payment history is retrieved
interface Payment {
  amount: number;
  asset: string;
  date: string;
  status: string;
  usdValue: number;
}
const payments: Payment[] = [];
export default function PaymentHistory() {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" gap="$s4" padding="$s4">
      <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-between">
        <Text emphasized flex={1} headline>
          Past payments
        </Text>
        <Pressable>
          <View alignItems="center" flexDirection="row" gap={2}>
            <Text color="$interactiveTextBrandDefault" emphasized fontWeight="bold" footnote>
              View all
            </Text>
            <ChevronRight color="$interactiveTextBrandDefault" fontWeight="bold" size={ms(14)} />
          </View>
        </Pressable>
      </View>
      {payments.length > 0 ? (
        payments.map(({ amount, asset, date, status, usdValue }, index) => (
          <View alignItems="center" flexDirection="row" gap={ms(16)} key={index}>
            <View
              alignItems="center"
              backgroundColor="$backgroundBrandMild"
              borderRadius="$r3"
              height={ms(40)}
              justifyContent="center"
              width={ms(40)}
            >
              <Check color="$uiSuccessPrimary" fontWeight="bold" size={ms(20)} />
            </View>
            <View flex={1} gap={ms(5)}>
              <View alignItems="center" flexDirection="row" justifyContent="space-between">
                <View gap={ms(5)}>
                  <Text fontSize={ms(15)}>{status}</Text>
                  <Text color="$uiNeutralSecondary" fontSize={ms(12)}>
                    {date}
                  </Text>
                </View>
                <View gap={ms(5)}>
                  <View alignItems="center" flexDirection="row" justifyContent="flex-end">
                    <Text fontSize={ms(15)} fontWeight="bold">
                      -
                    </Text>
                    <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                      {usdValue.toLocaleString(undefined, {
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                        currencySign: "standard",
                        style: "currency",
                      })}
                    </Text>
                  </View>
                  <Text color="$uiNeutralSecondary" fontSize={ms(12)} textAlign="right">
                    {amount.toLocaleString()} {asset}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
          No payments have been made.
        </Text>
      )}
    </View>
  );
}
