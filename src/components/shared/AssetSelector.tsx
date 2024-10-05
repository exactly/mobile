import { Address } from "@exactly/common/validation";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { ToggleGroup, YStack } from "tamagui";
import { safeParse } from "valibot";

import assetLogos from "../../utils/assetLogos";
import Text from "../shared/Text";
import View from "../shared/View";
import AssetLogo from "./AssetLogo";

interface Position {
  assetName: string;
  decimals: number;
  floatingDepositAssets: bigint;
  market: string;
  symbol: string;
  usdValue: bigint;
}

interface AssetSelectorProperties {
  onSubmit: (market: Address) => void;
  positions: Position[] | undefined;
}

export default function AssetSelector({ onSubmit, positions }: AssetSelectorProperties) {
  const [selectedMarket, setSelectedMarket] = React.useState<Address | undefined>();

  if (!positions || positions.length === 0) {
    return (
      <Text color="$uiNeutralSecondary" emphasized footnote textAlign="center">
        No available assets.
      </Text>
    );
  }

  return (
    <YStack gap="$s2">
      <ToggleGroup
        backgroundColor="transparent"
        borderColor="$borderNeutralSeparator"
        borderWidth={1}
        flexDirection="column"
        onValueChange={(value) => {
          const market = safeParse(Address, value);
          if (!market.success) return;
          setSelectedMarket(market.output);
          onSubmit(market.output);
        }}
        padding="$s3"
        type="single"
        value={selectedMarket}
      >
        {positions.map(({ assetName, decimals, floatingDepositAssets, market, symbol, usdValue }, index) => (
          <ToggleGroup.Item
            alignItems="stretch"
            backgroundColor="transparent"
            borderColor={selectedMarket === market ? "$borderBrandStrong" : "transparent"}
            borderRadius="$r_2"
            borderWidth={1}
            key={index}
            paddingHorizontal="$s4"
            paddingVertical={0}
            value={market}
          >
            <View alignItems="center" flexDirection="row" justifyContent="space-between" paddingVertical={vs(10)}>
              <View alignItems="center" flexDirection="row" gap={ms(10)} maxWidth="50%">
                <AssetLogo height={ms(32)} uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} />
                <View alignItems="flex-start" flexShrink={1} gap="$s2">
                  <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold" numberOfLines={1}>
                    {symbol}
                  </Text>
                  <Text color="$uiNeutralSecondary" fontSize={ms(12)} numberOfLines={1}>
                    {assetName}
                  </Text>
                </View>
              </View>
              <View flex={1} gap="$s2">
                <View alignItems="center" flexDirection="row" justifyContent="flex-end">
                  <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold" textAlign="right">
                    {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                      style: "currency",
                    })}
                  </Text>
                </View>
                <Text color="$uiNeutralSecondary" fontSize={ms(12)} textAlign="right">
                  {`${(Number(floatingDepositAssets) / 10 ** decimals).toLocaleString(undefined, {
                    maximumFractionDigits: Math.min(
                      8,
                      Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(usdValue) / 1e18)))),
                    ),
                    minimumFractionDigits: 0,
                    useGrouping: false,
                  })} ${symbol}`}
                </Text>
              </View>
            </View>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </YStack>
  );
}
