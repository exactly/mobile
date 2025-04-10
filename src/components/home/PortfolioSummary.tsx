import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { Skeleton } from "moti/skeleton";
import React, { useRef } from "react";
import { Appearance } from "react-native";
import { View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";

export default function PortfolioSummary({ usdBalance }: { usdBalance: bigint }) {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({ address: previewerAddress, args: [address ?? zeroAddress] });
  const lastNavigationTime = useRef(0);
  const symbols = markets
    ?.map(({ symbol, floatingDepositAssets }) => ({
      floatingDepositAssets,
      symbol: symbol.slice(3) === "WETH" ? "ETH" : symbol.slice(3),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0)
    .map(({ symbol }) => symbol);

  const handleNavigation = () => {
    const now = Date.now();
    if (now - lastNavigationTime.current < 500) {
      return;
    }
    lastNavigationTime.current = now;
    router.push("/portfolio");
  };

  return (
    <View
      display="flex"
      justifyContent="center"
      borderWidth={1}
      borderColor="$borderNeutralSoft"
      backgroundColor="$backgroundSoft"
      borderRadius="$r3"
      paddingVertical="$s3_5"
      paddingHorizontal="$s2_5"
      onPress={handleNavigation}
    >
      <View
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        gap="$s2"
      >
        <Text color="$uiNeutralSecondary" emphasized footnote>
          YOUR PORTFOLIO
        </Text>
        {symbols ? (
          <Text
            sensitive
            textAlign="center"
            subHeadline
            emphasized
            overflow="hidden"
            maxFontSizeMultiplier={1}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {(Number(usdBalance) / 1e18).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
        ) : (
          <Skeleton height={20} width={90} colorMode={Appearance.getColorScheme() ?? "light"} />
        )}
        <View flexDirection="row">
          {symbols ? (
            symbols.map((symbol, index) => (
              <View key={symbol} marginRight={index < symbols.length - 1 ? -8 : 0} zIndex={index}>
                <AssetLogo uri={assetLogos[symbol as keyof typeof assetLogos]} width={16} height={16} />
              </View>
            ))
          ) : (
            <Skeleton radius="round" colorMode={Appearance.getColorScheme() ?? "light"} height={16} width={16} />
          )}
        </View>

        <ChevronRight size={24} color="$interactiveTextBrandDefault" />
      </View>
    </View>
  );
}
