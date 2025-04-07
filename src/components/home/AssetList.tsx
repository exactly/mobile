import { previewerAddress, ratePreviewerAddress } from "@exactly/common/generated/chain";
import { floatingDepositRates } from "@exactly/lib";
import { Skeleton } from "moti/skeleton";
import React from "react";
import { Appearance, Image } from "react-native";
import { vs } from "react-native-size-matters";
import { YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly, useReadRatePreviewerSnapshot } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import useAccountAssets from "../../utils/useAccountAssets";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";
import View from "../shared/View";
interface AssetItem {
  symbol: string;
  name: string;
  logoURI?: string;
  market?: string;
  assetName?: string;
  amount: bigint;
  decimals: number;
  usdPrice: bigint;
  usdValue: bigint;
  rate?: bigint;
}

function AssetRow({ asset }: { asset: AssetItem }) {
  const { symbol, name, logoURI, amount, decimals, usdPrice, usdValue, rate } = asset;

  const logoSource = logoURI ?? assetLogos[symbol as keyof typeof assetLogos];

  const displayName = asset.assetName === "Wrapped Ether" ? "Ether" : (asset.assetName ?? name);

  return (
    <View flexDirection="row" alignItems="center" borderColor="$borderNeutralSoft">
      <View flexDirection="row" alignItems="center" paddingVertical={vs(10)} gap="$s2">
        <View flexDirection="row" gap={10} alignItems="center" flex={1}>
          {logoURI ? (
            <Image source={{ uri: logoSource }} width={32} height={32} borderRadius={16} />
          ) : (
            <AssetLogo uri={logoSource} width={32} height={32} />
          )}
          <View gap="$s2" alignItems="flex-start">
            <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1}>
              {symbol}
            </Text>
            <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </View>
        <View gap={5} flex={1.5}>
          <View flexDirection="row" alignItems="center" justifyContent="flex-end">
            <Text emphasized subHeadline numberOfLines={1} adjustsFontSizeToFit>
              {(Number(usdPrice) / 1e18).toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                currencyDisplay: "narrowSymbol",
              })}
            </Text>
          </View>
          {rate === undefined ? (
            asset.market ? (
              <Skeleton height={20} width={50} colorMode={Appearance.getColorScheme() ?? "light"} />
            ) : (
              <Text caption textAlign="right" color="transparent">
                -
              </Text>
            )
          ) : (
            <Text caption textAlign="right">
              {(Number(rate) / 1e18).toLocaleString(undefined, {
                style: "percent",
              })}
            </Text>
          )}
        </View>
        <View gap={5} flex={1}>
          <Text sensitive emphasized subHeadline numberOfLines={1} adjustsFontSizeToFit textAlign="right">
            {(Number(usdValue) / 1e18).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
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
}

function AssetSection({ title, assets }: { title: string; assets: AssetItem[] }) {
  if (assets.length === 0) return null;

  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padded gap="$s2_5">
      <Text emphasized headline color="$uiNeutralPrimary">
        {title}
      </Text>
      {assets.map((asset, index) => (
        <AssetRow key={index} asset={asset} />
      ))}
    </View>
  );
}

export default function AssetList() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    args: [address ?? zeroAddress],
  });

  const { externalAssets } = useAccountAssets();
  const { data: snapshots, dataUpdatedAt } = useReadRatePreviewerSnapshot({
    address: ratePreviewerAddress,
  });

  const rates = snapshots ? floatingDepositRates(snapshots, Math.floor(dataUpdatedAt / 1000)) : [];

  const collateralAssets =
    markets
      ?.map((market) => {
        const symbol = market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3);
        const rate = rates.find((r: { market: string; rate: bigint }) => r.market === market.market)?.rate;

        return {
          symbol,
          name: symbol,
          assetName: market.assetName === "Wrapped Ether" ? "Ether" : market.assetName,
          market: market.market,
          amount: market.floatingDepositAssets,
          decimals: market.decimals,
          usdPrice: market.usdPrice,
          usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
          rate,
        };
      })
      .filter(({ amount, symbol }) => (symbol === "USDC.e" ? amount > 0n : true))
      .sort((a, b) => Number(b.usdValue) - Number(a.usdValue)) ?? [];

  const externalAssetItems = externalAssets.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    logoURI: asset.logoURI,
    amount: asset.amount ?? 0n,
    decimals: asset.decimals,
    usdValue: BigInt(Number(asset.usdValue) * 1e18),
    usdPrice: BigInt(Number(asset.priceUSD) * 1e18),
  }));

  return (
    <YStack gap="$s4">
      <AssetSection title="Collateral Assets" assets={collateralAssets} />
      <AssetSection title="Other Assets" assets={externalAssetItems} />
    </YStack>
  );
}
