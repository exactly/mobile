import { previewerAddress, ratePreviewerAddress } from "@exactly/common/generated/chain";
import { floatingDepositRates } from "@exactly/lib";
import { Skeleton } from "moti/skeleton";
import React from "react";
import { Appearance, Image } from "react-native";
import { ms, vs } from "react-native-size-matters";
import { YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly, useReadRatePreviewerSnapshot } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import useAccountAssets from "../../utils/useAccountAssets";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AssetList() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({ address: previewerAddress, args: [address ?? zeroAddress] });
  const { externalAssets } = useAccountAssets();
  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets, symbol }) => (symbol === "USDC.e" ? floatingDepositAssets > 0n : true))
    .sort((a, b) => Number(b.usdValue) - Number(a.usdValue));
  const { data: snapshots, dataUpdatedAt } = useReadRatePreviewerSnapshot({ address: ratePreviewerAddress });

  const rates = snapshots ? floatingDepositRates(snapshots, Math.floor(dataUpdatedAt / 1000)) : [];
  return (
    <YStack>
      <View backgroundColor="$backgroundSoft" borderRadius="$r3" padded gap="$s2_5">
        <Text emphasized headline color="$uiNeutralPrimary">
          Collateral Assets
        </Text>
        {positions?.map(({ symbol, assetName, floatingDepositAssets, decimals, usdValue, usdPrice, market }, index) => {
          const rate = rates.find((r: { market: string; rate: bigint }) => r.market === market)?.rate;
          return (
            <View key={index} flexDirection="row" alignItems="center" borderColor="$borderNeutralSoft">
              <View flexDirection="row" alignItems="center" paddingVertical={vs(10)} gap="$s2">
                <View flexDirection="row" gap={ms(10)} alignItems="center" flex={1}>
                  <AssetLogo uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
                  <View gap="$s2" alignItems="flex-start">
                    <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1} adjustsFontSizeToFit>
                      {symbol}
                    </Text>
                    <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
                      {assetName === "Wrapped Ether" ? "Ether" : assetName}
                    </Text>
                  </View>
                </View>
                <View gap={ms(5)} flex={1.5}>
                  <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                    <Text emphasized subHeadline numberOfLines={1} adjustsFontSizeToFit>
                      {(Number(usdPrice) / 1e18).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                  </View>
                  {rate === undefined ? (
                    <Skeleton height={ms(20)} width={ms(50)} colorMode={Appearance.getColorScheme() ?? "light"} />
                  ) : (
                    <Text caption textAlign="right">
                      {(Number(rate) / 1e18).toLocaleString(undefined, {
                        style: "percent",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  )}
                </View>
                <View gap={ms(5)} flex={1}>
                  <Text sensitive emphasized subHeadline numberOfLines={1} adjustsFontSizeToFit textAlign="right">
                    {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                  <Text caption color="$uiNeutralSecondary" textAlign="right">
                    {(Number(floatingDepositAssets) / 10 ** decimals).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: Math.min(
                        8,
                        Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(usdValue) / 1e18)))),
                      ),
                      useGrouping: false,
                    })}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s2_5">
        <Text emphasized headline color="$uiNeutralPrimary" numberOfLines={1}>
          Other Assets
        </Text>
        {externalAssets.map(({ name, symbol, logoURI, amount, priceUSD, decimals, usdValue }, index) => {
          return (
            <View
              key={index}
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              borderColor="$borderNeutralSoft"
            >
              <View flexDirection="row" paddingVertical={vs(10)} flex={1}>
                <View flexDirection="row" gap={ms(10)} flex={1} alignItems="center">
                  <Image source={{ uri: logoURI }} width={ms(32)} height={ms(32)} style={{ borderRadius: ms(16) }} />
                  <View gap="$s2" alignItems="flex-start" flexShrink={1}>
                    <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1}>
                      {symbol}
                    </Text>
                    <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                </View>
                <View gap={ms(5)} flex={1.5}>
                  <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                    <Text emphasized subHeadline numberOfLines={1} adjustsFontSizeToFit>
                      {Number(priceUSD).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        notation: "compact",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                  </View>
                </View>
                <View gap={ms(5)} flex={1}>
                  <View flexDirection="row" alignItems="flex-start" justifyContent="flex-end">
                    <Text sensitive emphasized subHeadline textAlign="right">
                      {Number(usdValue).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                  </View>
                  <Text caption color="$uiNeutralSecondary" textAlign="right">
                    {(Number(amount) / 10 ** decimals).toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: Math.min(
                        8,
                        Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(usdValue) / 1e18)))),
                      ),
                      useGrouping: false,
                    })}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </YStack>
  );
}
