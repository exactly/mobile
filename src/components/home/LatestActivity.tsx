import { ArrowDown, ArrowDownToLine, ArrowUpRight } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text } from "tamagui";

type Activity = "in" | "out" | "deposit";

const assetChangeToIcon = {
  in: ArrowDown,
  out: ArrowUpRight,
  deposit: ArrowDownToLine,
};
const activity: {
  title: string;
  date: string;
  asset: {
    change: Activity;
    symbol: string;
    amount: string;
    usdValue: string;
  };
}[] = [
  {
    title: "Received USDC",
    date: "2023/07/17",
    asset: {
      change: "in",
      symbol: "USDC",
      amount: "3348.12",
      usdValue: "$3,348.12",
    },
  },
  {
    title: "Sent WBTC",
    date: "0/01/24",
    asset: {
      change: "out",
      symbol: "WBTC",
      amount: "0.00123",
      usdValue: "$200.00",
    },
  },
  {
    title: "Funds added",
    date: "3/01/24",
    asset: {
      change: "in",
      symbol: "ETH",
      amount: "3.889",
      usdValue: "$10,750.00",
    },
  },
];

export default function LatestActivity() {
  if (activity.length === 0) {
    return (
      <Text textAlign="center" fontSize={ms(15)} color="$uiNeutralSecondary">
        There&apos; no activity in your account. Start by adding funds to it.
      </Text>
    );
  }

  const getIcon = (change: "in" | "out" | "deposit") => {
    const Icon = assetChangeToIcon[change];
    return <Icon size={ms(20)} color="$uiSuccessPrimary" fontWeight="bold" />;
  };

  return (
    <View flexDirection="column" gap={ms(24)}>
      {activity.map(({ title, date, asset }, index) => (
        <View key={index} flexDirection="row" gap={ms(16)} alignItems="center">
          <View
            width={ms(40)}
            height={ms(40)}
            backgroundColor="$backgroundBrandMild"
            borderRadius="$r3"
            justifyContent="center"
            alignItems="center"
          >
            {getIcon(asset.change)}
          </View>
          <View flex={1} gap={ms(5)}>
            <View flexDirection="row" justifyContent="space-between" alignItems="center">
              <View gap={ms(5)}>
                <Text fontSize={ms(15)} color="$uiPrimary">
                  {title}
                </Text>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                  {date}
                </Text>
              </View>
              <View gap={ms(5)}>
                <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                  <Text
                    fontSize={ms(15)}
                    color={asset.change === "out" ? "$uiErrorPrimary" : "$uiSuccessPrimary"}
                    fontWeight="bold"
                  >
                    {asset.change === "out" ? "-" : "+"}
                  </Text>
                  <Text fontSize={ms(15)} color="$uiPrimary" fontWeight="bold" textAlign="right">
                    {asset.usdValue}
                  </Text>
                </View>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                  {asset.amount} {asset.symbol}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
