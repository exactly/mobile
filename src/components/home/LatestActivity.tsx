import { ArrowDown, ArrowLineDown, ArrowUpRight } from "phosphor-react-native";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

type Activity = "in" | "out" | "deposit";
const hasActivity = true;
const assetChangeToIcon = {
  in: ArrowDown,
  out: ArrowUpRight,
  deposit: ArrowLineDown,
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

const LatestActivity = () => {
  const theme = useTheme();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!hasActivity || !activity || activity.length === 0) {
    return (
      <Text textAlign="center" fontSize={ms(15)} color="$uiSecondary">
        There&apos; no activity in your account. Start by adding funds to it.
      </Text>
    );
  }

  const getIcon = (change: "in" | "out" | "deposit") => {
    const Icon = assetChangeToIcon[change];
    return <Icon size={ms(20)} color={theme.textSuccessPrimary.get() as string} />;
  };

  return (
    <View flexDirection="column" gap={ms(24)}>
      {activity.map(({ title, date, asset }, index) => (
        <View key={index} flexDirection="row" gap={ms(16)} alignItems="center">
          <View
            width={ms(40)}
            height={ms(40)}
            backgroundColor="$backgroundBrandMild"
            borderRadius={10}
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
                <Text fontSize={ms(12)} color="$uiSecondary">
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
                <Text fontSize={ms(12)} color="$uiSecondary" textAlign="right">
                  {asset.amount} {asset.symbol}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default LatestActivity;
