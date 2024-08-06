import { TrendingDown, TrendingUp } from "@tamagui/lucide-icons";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { Image, View } from "tamagui";

import Text from "../shared/Text";

interface Asset {
  image: string;
  apr: number;
  balance: number;
  ticker: string;
  usdValue: number;
  change: {
    usdValue: number;
    percentage: number;
  };
}

const assets: Asset[] = [
  {
    image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=024",
    apr: 0.5,
    balance: 0.75,
    ticker: "BTC",
    usdValue: 45_546.3,
    change: {
      usdValue: 1000,
      percentage: 3.45,
    },
  },
  {
    image: "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=024",
    apr: 2,
    balance: 2,
    ticker: "ETH",
    usdValue: 6854.34,
    change: {
      usdValue: 50,
      percentage: 2.56,
    },
  },
  {
    image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
    apr: 4.3,
    balance: 250,
    ticker: "USDC",
    usdValue: 250,
    change: {
      usdValue: -0.01,
      percentage: -0.01,
    },
  },
];

export default function AssetList() {
  return (
    <View width="100%">
      {assets.map(({ ticker, usdValue, change, balance, apr, image }, index) => (
        <View
          key={index}
          flexDirection="row"
          gap={ms(16)}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={index === assets.length - 1 ? 0 : 1}
          borderColor="$borderNeutralSoft"
        >
          <View flexDirection="row" paddingVertical={vs(10)} flex={1}>
            <View flexDirection="row" gap={ms(10)} flex={1}>
              <Image src={image} alt={`${ticker} logo`} width={ms(40)} height={ms(40)} />
              <View gap={ms(5)}>
                <Text fontSize={ms(15)} fontWeight="bold">
                  {ticker}
                </Text>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                  {apr}% APR
                </Text>
              </View>
            </View>

            <View gap={ms(5)} flex={1}>
              <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                  ${Intl.NumberFormat("en-US").format(usdValue)}
                </Text>
              </View>
              <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                {balance} {ticker}
              </Text>
            </View>

            <View gap={ms(5)} flex={1} justifyContent="flex-end">
              <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                <Text
                  fontSize={ms(15)}
                  color={change.usdValue < 0 ? "$uiErrorPrimary" : "$uiSuccessSecondary"}
                  fontWeight="bold"
                >
                  ${Intl.NumberFormat("en-US").format(change.usdValue)}
                </Text>
              </View>
              <View flexDirection="row" justifyContent="flex-end" gap={ms(5)}>
                {change.percentage < 0 ? (
                  <TrendingDown size={20} color="$interactiveOnBaseErrorSoft" />
                ) : (
                  <TrendingUp size={20} color="$uiSuccessSecondary" />
                )}
                <Text fontSize={ms(15)} color={change.percentage < 0 ? "$uiErrorPrimary" : "$uiSuccessSecondary"}>
                  {change.percentage}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
