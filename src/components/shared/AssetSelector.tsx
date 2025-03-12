import chain, { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { withdrawLimit } from "@exactly/lib";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "moti/skeleton";
import React, { useState } from "react";
import { Appearance, Image } from "react-native";
import { ms, vs } from "react-native-size-matters";
import { ToggleGroup, YStack } from "tamagui";
import { safeParse } from "valibot";
import { zeroAddress } from "viem";
import { optimism } from "viem/chains";
import { useAccount } from "wagmi";

import AssetLogo from "./AssetLogo";
import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import { getTokenBalances } from "../../utils/lifi";
import Text from "../shared/Text";
import View from "../shared/View";

interface ProtocolAsset {
  type: "protocol";
  symbol: string;
  assetName: string;
  floatingDepositAssets: bigint;
  decimals: number;
  usdValue: number;
  market: `0x${string}`;
}

interface ExternalAsset {
  type: "external";
  name: string;
  symbol: string;
  logoURI?: string;
  address: string;
  amount?: bigint;
  priceUSD: string;
  decimals: number;
  usdValue: number;
}

export default function AssetSelector({
  onSubmit,
  useExternalAssets = false,
}: {
  positions?: {
    symbol: string;
    assetName: string;
    floatingDepositAssets: bigint;
    decimals: number;
    usdValue: bigint;
    market: string;
  }[];
  onSubmit: (market: Address, isExternalAsset: boolean) => void;
  useExternalAssets?: boolean;
}) {
  const [selectedMarket, setSelectedMarket] = useState<Address | undefined>();
  const { address: account } = useAccount();
  const { data: markets } = useReadPreviewerExactly({ address: previewerAddress, args: [account ?? zeroAddress] });

  const { data: externalAssets, isPending: isExternalAssetsPending } = useQuery({
    queryKey: ["externalAssets", account],
    queryFn: async () => {
      if (chain.id !== optimism.id || !account) return [];
      const balances = await getTokenBalances(account);
      return balances.filter(
        ({ address }) => markets && !markets.some(({ market }) => address.toLowerCase() === market.toLowerCase()),
      );
    },
    enabled: !!account && useExternalAssets,
  });

  const protocol = (markets ?? [])
    .map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: markets
        ? Number((withdrawLimit(markets, market.market) * market.usdPrice) / BigInt(10 ** market.decimals)) / 1e18
        : 0,
      type: "protocol",
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0) as ProtocolAsset[];

  const external = (externalAssets ?? []).map((externalAsset) => ({
    ...externalAsset,
    usdValue: (Number(externalAsset.priceUSD) * Number(externalAsset.amount ?? 0n)) / 10 ** externalAsset.decimals,
    type: "external",
  })) as ExternalAsset[];

  const combinedAssets = [...protocol, ...external].sort((a, b) => Number(b.usdValue) - Number(a.usdValue));

  if (combinedAssets.length === 0) {
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
          const isExternalAsset = useExternalAssets && externalAssets?.some(({ address }) => address === market.output);
          onSubmit(market.output, isExternalAsset ?? false);
        }}
        value={selectedMarket}
      >
        {combinedAssets.map((item) => {
          if (item.type === "external") {
            const { name, symbol, logoURI, address, amount, priceUSD, decimals, usdValue } = item;
            return (
              <ToggleGroup.Item unstyled key={address} value={address} borderWidth={0}>
                <View
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  paddingVertical={vs(10)}
                  backgroundColor={selectedMarket === address ? "$interactiveBaseBrandSoftDefault" : "transparent"}
                  width="100%"
                  paddingHorizontal="$s4"
                  borderRadius="$r3"
                >
                  <View flexDirection="row" gap={ms(10)} alignItems="center" maxWidth="50%">
                    <Image source={{ uri: logoURI }} width={ms(32)} height={ms(32)} style={{ borderRadius: ms(16) }} />
                    <View gap="$s2" alignItems="flex-start" flexShrink={1}>
                      <Text fontSize={ms(15)} fontWeight="bold" color="$uiNeutralPrimary" numberOfLines={1}>
                        {symbol}
                      </Text>
                      <Text fontSize={ms(12)} color="$uiNeutralSecondary" numberOfLines={1}>
                        {name}
                      </Text>
                    </View>
                  </View>
                  <View gap="$s2" flex={1}>
                    <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                      <Text fontSize={ms(15)} fontWeight="bold" textAlign="right" color="$uiNeutralPrimary">
                        {usdValue.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })}
                      </Text>
                    </View>
                    <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                      {`${(Number(amount ?? 0n) / 10 ** decimals).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: Math.min(
                          8,
                          Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(priceUSD) / 1e18)))),
                        ),
                        useGrouping: false,
                      })} ${symbol}`}
                    </Text>
                  </View>
                </View>
              </ToggleGroup.Item>
            );
          } else {
            const { symbol, assetName, decimals, usdValue, market } = item;
            return (
              <ToggleGroup.Item unstyled key={market} value={market} borderWidth={0}>
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
                        {usdValue.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })}
                      </Text>
                    </View>
                    <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                      {`${(Number(markets ? withdrawLimit(markets, market) : 0n) / 10 ** decimals).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: Math.min(
                            8,
                            Math.max(0, decimals - Math.ceil(Math.log10(Math.max(1, Number(usdValue) / 1e18)))),
                          ),
                          useGrouping: false,
                        },
                      )} ${symbol}`}
                    </Text>
                  </View>
                </View>
              </ToggleGroup.Item>
            );
          }
        })}
        {useExternalAssets && isExternalAssetsPending && (
          <View flexDirection="row" alignItems="center" width="100%">
            <Skeleton height={ms(50)} width="100%" colorMode={Appearance.getColorScheme() ?? "light"} />
          </View>
        )}
      </ToggleGroup>
    </YStack>
  );
}
