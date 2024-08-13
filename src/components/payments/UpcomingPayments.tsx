import { ChevronRight } from "@tamagui/lucide-icons";
import React from "react";

import Text from "../shared/Text";
import View from "../shared/View";

interface Payment {
  date: string;
  amount: number;
}

const payments: [Payment, ...Payment[]] = [
  { date: "Jun 28, 2024", amount: 852.96 },
  { date: "Jul 28, 2024", amount: 852.96 },
  { date: "Aug 28, 2024", amount: 852.96 },
];

function ListItem({ date, amount }: Payment) {
  return (
    <View flexDirection="row" justifyContent="space-between" alignItems="center">
      <View>
        <Text>{date}</Text>
      </View>
      <View flexDirection="row" alignItems="center" gap="$s2">
        <View>
          <Text>${amount}</Text>
        </View>
        <View>
          <ChevronRight size={24} color="$iconBrandDefault" />
        </View>
      </View>
    </View>
  );
}

export default function UpcomingPayments() {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s6">
      <View flexDirection="row" gap="$s3" alignItems="center" justifyContent="space-between">
        <Text emphasized headline flex={1}>
          Next payments
        </Text>
      </View>
      {payments.map(({ date, amount }, index) => (
        <ListItem key={index} date={date} amount={amount} />
      ))}
    </View>
  );
}
