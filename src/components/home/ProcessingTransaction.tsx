import { WAD } from "@exactly/lib";
import { Hourglass } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { styled, useTheme, XStack, YStack } from "tamagui";
import type { Address } from "viem";
import { formatUnits } from "viem";

import assetLogos from "../../utils/assetLogos";
import shortenAddress from "../../utils/shortenAddress";
import useMarketAccount from "../../utils/useMarketAccount";
import ActionButton from "../shared/ActionButton";
import AssetLogo from "../shared/AssetLogo";
import SafeView from "../shared/SafeView";
import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";

export default function ProcessingTransation() {
  type ProposalType = [bigint, Address, Address, bigint];
  const { data: proposal } = useQuery<ProposalType>({
    queryKey: ["proposal", "withdrawal"],
  });
  const { market } = useMarketAccount(proposal?.[1]);

  const theme = useTheme();

  if (!proposal) return null;

  const assetName = market?.symbol.slice(3) === "WETH" ? "ETH" : market?.symbol.slice(3);
  const amount = formatUnits(proposal[0], market?.decimals ?? 0);
  const usdValue = formatUnits((proposal[0] * (market?.usdPrice ?? 0n)) / WAD, market?.decimals ?? 0);

  return (
    <View fullScreen backgroundColor="$backgroundSoft">
      <StyledGradient
        locations={[0.5, 1]}
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={220}
        opacity={0.8}
        colors={[theme.backgroundMild.val, theme.backgroundSoft.val]}
      />
      <SafeView backgroundColor="transparent">
        <View fullScreen padded>
          <View fullScreen justifyContent="space-between">
            <YStack gap="$s7" paddingBottom="$s9">
              <XStack justifyContent="center" alignItems="center">
                <Spinner />
              </XStack>
              <YStack gap="$s4_5" justifyContent="center" alignItems="center">
                <Text secondary body>
                  Sending to
                  <Text emphasized primary body>
                    &nbsp; {shortenAddress(proposal[2], 8, 8)}
                  </Text>
                </Text>
                <Text title primary color="$uiNeutralPrimary">
                  {Number(usdValue).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>

                <XStack alignItems="center" gap="$s3">
                  <Text emphasized subHeadline color="$uiNeutralSecondary">
                    {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 0 })}
                    &nbsp; {assetName}
                  </Text>
                  <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(16)} height={ms(16)} />
                </XStack>
              </YStack>
            </YStack>

            <ActionButton
              marginTop="$s4"
              marginBottom="$s5"
              onPress={() => {
                router.back();
              }}
              iconAfter={<Hourglass color="$interactiveOnBaseBrandDefault" />}
            >
              Wait for completion
            </ActionButton>
          </View>
        </View>
      </SafeView>
    </View>
  );
}

const StyledGradient = styled(LinearGradient, {});
