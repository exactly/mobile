import { Address } from "@exactly/common/types";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { ToggleGroup, YStack } from "tamagui";
import { safeParse } from "valibot";

import AssetLogo from "./AssetLogo";
import assetLogos from "../../utils/assetLogos";
import Text from "../shared/Text";
import View from "../shared/View";

interface Position {
  symbol: string;
  assetName: string;
  floatingDepositAssets: bigint;
  decimals: number;
  usdValue: bigint;
  market: string;
}

interface AssetSelectorProperties {
  positions: Position[] | undefined;
  onSubmit: (market: Address) => void;
}

export default function AssetSelector({ positions, onSubmit }: AssetSelectorProperties) {
  const [selectedMarket, setSelectedMarket] = React.useState<Address | undefined>();

  if (!positions || positions.length === 0) {
    return (
      <Text textAlign="center" emphasized footnote color="$uiNeutralSecondary">
        No available assets.
      </Text>
    );
  }

  return (
    <YStack gap="$s2">
      <ToggleGroup
        type="single"
        flexDirection="column"
        backgroundColor="transparent"
        borderWidth={1}
        borderColor="$borderNeutralSeparator"
        padding="$s3"
        onValueChange={(value) => {
          const market = safeParse(Address, value);
          if (!market.success) return;
          setSelectedMarket(market.output);
          onSubmit(market.output);
        }}
        value={selectedMarket}
      >
        {positions.map(({ symbol, assetName, floatingDepositAssets, decimals, usdValue, market }, index) => (
          <ToggleGroup.Item
            key={index}
            value={market}
            paddingHorizontal="$s4"
            paddingVertical={0}
            backgroundColor="transparent"
            alignItems="stretch"
            borderWidth={1}
            borderRadius="$r_2"
            borderColor={selectedMarket === market ? "$borderBrandStrong" : "transparent"}
          >
            <View flexDirection="row" alignItems="center" justifyContent="space-between" paddingVertical={vs(10)}>
              <View flexDirection="row" gap={ms(10)} alignItems="center">
                <AssetLogo uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
                <View gap="$s2" alignItems="flex-start">
                  <Text fontSize={ms(15)} fontWeight="bold" color="$uiNeutralTertiary">
                    {symbol}
                  </Text>
                  <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                    {assetName}
                  </Text>
                </View>
              </View>
              <View gap="$s2" flex={1}>
                <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                  <Text fontSize={ms(15)} fontWeight="bold" textAlign="right" color="$uiNeutralTertiary">
                    {(Number(usdValue) / 1e18).toLocaleString(undefined, { style: "currency", currency: "USD" })}
                  </Text>
                </View>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                  {Number(floatingDepositAssets / BigInt(10 ** decimals)).toLocaleString()} {symbol}
                </Text>
              </View>
            </View>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </YStack>
  );
}