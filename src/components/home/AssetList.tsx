import { previewerAddress, ratePreviewerAddress } from "@exactly/common/generated/chain";
import { floatingDepositRates } from "@exactly/lib";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly, useReadRatePreviewerSnapshot } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";

export default function AssetList() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0)
    .sort((a, b) => Number(b.usdValue) - Number(a.usdValue));
  const { data: snapshots, dataUpdatedAt } = useReadRatePreviewerSnapshot({
    address: ratePreviewerAddress,
    account: address,
  });
  const rates = snapshots ? floatingDepositRates(snapshots, Math.floor(dataUpdatedAt / 1000)) : [];
  return (
    <View width="100%">
      {positions?.map(({ symbol, floatingDepositAssets, decimals, usdValue, market }, index) => (
        <View
          key={index}
          flexDirection="row"
          gap={ms(16)}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={index === positions.length - 1 ? 0 : 1}
          borderColor="$borderNeutralSoft"
        >
          <View flexDirection="row" alignItems="center" paddingVertical={vs(10)} flex={1}>
            <View flexDirection="row" gap={ms(10)} flex={1} alignItems="center">
              <AssetLogo uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} height={ms(32)} />
              <View gap={ms(5)}>
                <Text fontSize={ms(15)} fontWeight="bold">
                  {symbol}
                </Text>
                <Text>
                  {(
                    Number(rates.find((r: { market: string; rate: bigint }) => r.market === market)?.rate) / 1e18
                  ).toLocaleString(undefined, {
                    style: "percent",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  APR
                </Text>
              </View>
            </View>
            <View gap={ms(5)} flex={1}>
              <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                <Text sensitive fontSize={ms(15)} fontWeight="bold" textAlign="right">
                  {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>
              </View>
              <Text sensitive fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                {`${(Number(floatingDepositAssets) / 10 ** decimals).toLocaleString(undefined, {
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
        </View>
      ))}
    </View>
  );
}
