import { AirplaneTilt, ArrowUpRight, ForkKnife, Laptop } from "phosphor-react-native";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

type ActivityCategory = "food" | "tech" | "travel" | "other";

const hasActivity = true;

const activityCategoryToIcon = {
  food: ForkKnife,
  tech: Laptop,
  travel: AirplaneTilt,
  other: ArrowUpRight,
};

const activity: {
  title: string;
  date: string;
  category: ActivityCategory;
  asset: {
    symbol: string;
    amount: string;
    usdValue: string;
  };
}[] = [
  {
    title: "MacStation",
    date: "11/03/24",
    category: "tech",
    asset: {
      symbol: "USDC",
      amount: "2,499.98",
      usdValue: "$2,499.98",
    },
  },
  {
    title: "Despegar.com",
    date: "09/03/24",
    category: "travel",
    asset: {
      symbol: "ETH",
      amount: "0.1542",
      usdValue: "$487.00",
    },
  },
  {
    title: "Trescha Resto",
    date: "21/02/24",
    category: "food",
    asset: {
      symbol: "USDC",
      amount: "1,049.86",
      usdValue: "$1,049.86",
    },
  },
  {
    title: "Sent ETH",
    date: "13/02/24",
    category: "other",
    asset: {
      symbol: "ETH",
      amount: "0.1605",
      usdValue: "$500.00",
    },
  },
  {
    title: "Garbarino",
    date: "05/02/24",
    category: "tech",
    asset: {
      symbol: "ETH",
      amount: "0.6467",
      usdValue: "$1,750.00",
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

  const getIcon = (category: ActivityCategory) => {
    const Icon = activityCategoryToIcon[category];
    return <Icon size={ms(20)} color={theme.textSuccessPrimary.get() as string} weight="bold" />;
  };

  return (
    <View flexDirection="column" gap={ms(24)}>
      {activity.map(({ title, date, asset, category }, index) => (
        <View key={index} flexDirection="row" gap={ms(16)} alignItems="center">
          <View
            width={ms(40)}
            height={ms(40)}
            backgroundColor="$backgroundBrandMild"
            borderRadius={10}
            justifyContent="center"
            alignItems="center"
          >
            {getIcon(category)}
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
                  <Text fontSize={ms(15)} color="$uiErrorPrimary" fontWeight="bold">
                    -
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