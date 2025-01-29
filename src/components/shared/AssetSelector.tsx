import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { withdrawLimit } from "@exactly/lib";
import React, { useState } from "react";
import { ms, vs } from "react-native-size-matters";
import { ToggleGroup, YStack } from "tamagui";
import { safeParse } from "valibot";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import AssetLogo from "./AssetLogo";
import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import useDynamicHealthFactor from "../../utils/useDynamicHealthFactor";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AssetSelector({
  positions,
  onSubmit,
}: {
  positions?: {
    symbol: string;
    assetName: string;
    floatingDepositAssets: bigint;
    decimals: number;
    usdValue: bigint;
    market: string;
  }[];
  onSubmit: (market: Address) => void;
}) {
  const [selectedMarket, setSelectedMarket] = useState<Address | undefined>();

  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  const { calculateDynamicHealthFactor } = useDynamicHealthFactor();
  const targetHealthFactor = calculateDynamicHealthFactor();

  if (!positions || positions.length === 0) {
    return (
      <Text textAlign="center" emphasized footnote color="$uiNeutralSecondary">
        No available assets.
      </Text>
    );
  }

  return (
    <YStack gap="$s2" borderWidth={1} borderRadius="$r3" borderColor="$borderNeutralSeparator">
      <ToggleGroup
        type="single"
        flexDirection="column"
        backgroundColor="transparent"
        padding="$s3"
        onValueChange={(value) => {
          const market = safeParse(Address, value);
          if (!market.success) return;
          setSelectedMarket(market.output);
          onSubmit(market.output);
        }}
        value={selectedMarket}
      >
        {positions.map(({ symbol, assetName, decimals, usdValue, market }, index) => {
          const available = markets ? withdrawLimit(markets, market, targetHealthFactor) : 0n;
          return (
            <ToggleGroup.Item unstyled key={index} value={market} borderWidth={0}>
              <View
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                paddingVertical={vs(10)}
                backgroundColor={selectedMarket === market ? "$interactiveBaseBrandSoftDefault" : "transparent"}
                width="100%"
                paddingHorizontal="$s4"
                borderRadius="$r3"
              >
                <View flexDirection="row" gap={ms(10)} alignItems="center" maxWidth="50%">
                  <AssetLogo uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
                  <View gap="$s2" alignItems="flex-start" flexShrink={1}>
                    <Text fontSize={ms(15)} fontWeight="bold" color="$uiNeutralPrimary" numberOfLines={1}>
                      {symbol}
                    </Text>
                    <Text fontSize={ms(12)} color="$uiNeutralSecondary" numberOfLines={1}>
                      {assetName === "Wrapped Ether" ? "Ether" : assetName}
                    </Text>
                  </View>
                </View>
                <View gap="$s2" flex={1}>
                  <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                    <Text fontSize={ms(15)} fontWeight="bold" textAlign="right" color="$uiNeutralPrimary">
                      {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                  </View>
                  <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                    {`${(Number(available) / 10 ** decimals).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: Math.min(
                        8,
                        Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(usdValue) / 1e18)))),
                      ),
                      useGrouping: false,
                    })} ${symbol}`}
                  </Text>
                </View>
              </View>
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup>
    </YStack>
  );
}
