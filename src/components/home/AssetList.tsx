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
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0);
  return (
    <View width="100%">
      {positions?.map(({ symbol, floatingDepositAssets, decimals, usdValue }, index) => (
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
                {Number(floatingDepositAssets / BigInt(10 ** decimals)).toLocaleString()} {symbol}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
