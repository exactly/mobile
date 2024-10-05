import { previewerAddress } from "@exactly/common/generated/chain";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";

export default function AssetList() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
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
  return (
    <View width="100%">
      {positions?.map(({ decimals, floatingDepositAssets, symbol, usdValue }, index) => (
        <View
          alignItems="center"
          borderBottomWidth={index === positions.length - 1 ? 0 : 1}
          borderColor="$borderNeutralSoft"
          flexDirection="row"
          gap={ms(16)}
          justifyContent="space-between"
          key={index}
        >
          <View alignItems="center" flex={1} flexDirection="row" paddingVertical={vs(10)}>
            <View alignItems="center" flex={1} flexDirection="row" gap={ms(10)}>
              <AssetLogo height={ms(32)} uri={assetLogos[symbol as keyof typeof assetLogos]} width={ms(32)} />
              <View gap={ms(5)}>
                <Text fontSize={ms(15)} fontWeight="bold">
                  {symbol}
                </Text>
              </View>
            </View>
            <View flex={1} gap={ms(5)}>
              <View alignItems="center" flexDirection="row" justifyContent="flex-end">
                <Text fontSize={ms(15)} fontWeight="bold" sensitive textAlign="right">
                  {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                    style: "currency",
                  })}
                </Text>
              </View>
              <Text color="$uiNeutralSecondary" fontSize={ms(12)} sensitive textAlign="right">
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
        </View>
      ))}
    </View>
  );
}
