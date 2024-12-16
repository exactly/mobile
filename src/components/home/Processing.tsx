import { exaPluginAddress } from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import { WAD } from "@exactly/lib";
import { Check, Hourglass, ArrowUpRight } from "@tamagui/lucide-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Square, styled, useTheme, XStack, YStack } from "tamagui";
import { formatUnits, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadExaPluginProposals } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import useMarketAccount from "../../utils/useMarketAccount";
import ActionButton from "../shared/ActionButton";
import AssetLogo from "../shared/AssetLogo";
import SafeView from "../shared/SafeView";
import Spinner from "../shared/Spinner";
import Text from "../shared/Text";
import View from "../shared/View";
export default function Processing() {
  const { address } = useAccount();
  const [proposalAmount, setProposalAmount] = useState<bigint>();

  const { data: proposal } = useReadExaPluginProposals({
    address: exaPluginAddress,
    args: [address ?? zeroAddress],
    query: { refetchInterval: 5000, gcTime: 0 },
  });

  const { market } = useMarketAccount(proposal?.[1]);

  const theme = useTheme();

  if (!proposal || !market) return null;

  if (proposal[0] > 0n && !proposalAmount) setProposalAmount(proposal[0]);

  const assetName = market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3);
  const amount = proposalAmount ?? proposal[0];
  const pending = proposal[0] > 0n;

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
        colors={
          pending
            ? [theme.backgroundMild.val, theme.backgroundSoft.val]
            : [theme.interactiveBaseSuccessSoftDefault.val, theme.backgroundSoft.val]
        }
      />

      <SafeView backgroundColor="transparent">
        <View fullScreen padded>
          <View fullScreen justifyContent="space-between">
            <YStack gap="$s7" paddingBottom="$s9" flex={1}>
              <XStack justifyContent="center" alignItems="center">
                {pending ? (
                  <Spinner />
                ) : (
                  <Square borderRadius="$r4" backgroundColor="$interactiveBaseSuccessSoftDefault" size={ms(80)}>
                    <Check size={ms(56)} color="$interactiveOnBaseSuccessSoft" />
                  </Square>
                )}
              </XStack>
              <YStack gap="$s4_5" justifyContent="center" alignItems="center">
                <Text secondary body>
                  {pending ? "Sending to" : "Sent to"}
                  <Text emphasized primary body>
                    &nbsp; {shortenHex(proposal[2], 8, 8)}
                  </Text>
                </Text>
                <Text title primary color="$uiNeutralPrimary">
                  {Number(formatUnits((amount * market.usdPrice) / WAD, market.decimals)).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>

                <XStack alignItems="center" gap="$s3">
                  <Text emphasized subHeadline color="$uiNeutralSecondary">
                    {Number(formatUnits(amount, market.decimals)).toLocaleString(undefined, {
                      maximumFractionDigits: 8,
                      minimumFractionDigits: 0,
                    })}
                    &nbsp; {assetName}
                  </Text>
                  <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(16)} height={ms(16)} />
                </XStack>
              </YStack>
              {pending && (
                <Text textAlign="center" color="$uiNeutralSecondary" paddingBottom="$s4">
                  This transaction
                  <Text color="$uiNeutralSecondary" emphasized>
                    &nbsp; will take around 5 minutes
                  </Text>
                  &nbsp;to complete. To start a new one, please wait until it’s finished.
                </Text>
              )}
            </YStack>

            <ActionButton
              marginVertical="$s4"
              onPress={() => {
                if (pending) {
                  router.back();
                } else {
                  router.push("/send-funds");
                }
              }}
              iconAfter={
                pending ? (
                  <Hourglass color="$interactiveOnBaseBrandDefault" />
                ) : (
                  <ArrowUpRight color="$interactiveOnBaseBrandDefault" />
                )
              }
            >
              {pending ? "Wait for completion" : "Send another"}
            </ActionButton>
            {!pending && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <Text emphasized footnote centered color="$interactiveBaseBrandDefault">
                  Close
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeView>
    </View>
  );
}

const StyledGradient = styled(LinearGradient, {});
