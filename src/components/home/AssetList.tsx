import { Minus } from "@tamagui/lucide-icons";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { Image, View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { previewerAddress, useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";

const symbolToIcon: Record<string, string> = {
  ETH: "https://assets.smold.app/api/token/1/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/logo.svg",
  OP: "https://assets.smold.app/api/token/10/0x4200000000000000000000000000000000000042/logo.svg",
  DAI: "https://assets.smold.app/api/token/10/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1/logo.svg",
  WBTC: "https://assets.smold.app/api/token/10/0x68f180fcCe6836688e9084f035309E29Bf0A2095/logo.svg",
  wstETH: "https://assets.smold.app/api/token/10/0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb/logo.svg",
  USDC: "https://assets.smold.app/api/token/10/0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85/logo.svg",
  "USDC.e": "https://assets.smold.app/api/token/10/0x7F5c764cBc14f9669B88837ca1490cCa17c31607/logo.svg",
};

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
              <Image
                source={{
                  uri: symbolToIcon[symbol],
                }}
                width={ms(32)}
                height={ms(32)}
                borderRadius="$r_0"
              />
              <View gap={ms(5)}>
                <Text fontSize={ms(15)} fontWeight="bold">
                  {symbol}
                </Text>
                <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                  0% APR
                </Text>
              </View>
            </View>
            <View gap={ms(5)} flex={1}>
              <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                  {(Number(usdValue) / 1e18).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </Text>
              </View>
              <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                {Number(floatingDepositAssets / BigInt(10 ** decimals)).toLocaleString("en-US")} {symbol}
              </Text>
            </View>
            <View gap={ms(5)} flex={1} justifyContent="flex-end">
              <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                <Text fontSize={ms(15)} color="$uiNeutralSecondary" fontWeight="bold">
                  $0
                </Text>
              </View>
              <View flexDirection="row" justifyContent="flex-end" alignItems="center" gap={ms(5)}>
                <Minus size={ms(16)} color="$uiNeutralSecondary" />
                <Text fontSize={ms(15)} color="$uiNeutralSecondary">
                  0%
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
