import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import type { Passkey } from "@exactly/common/validation";
import { Eye, EyeOff, Info } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import CardDetails from "./CardDetails";
import SimulatePurchase from "./SimulatePurchase";
import SpendingLimits from "./SpendingLimits";
import ExaCard from "./exa-card/ExaCard";
import {
  useReadPreviewerExactly,
  useReadUpgradeableModularAccountGetInstalledPlugins,
} from "../../generated/contracts";
import handleError from "../../utils/handleError";
import { verifyIdentity } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { APIError, getActivity, getCard, createCard, kycStatus } from "../../utils/server";
import useIntercom from "../../utils/useIntercom";
import useMarketAccount from "../../utils/useMarketAccount";
import InfoBadge from "../shared/InfoBadge";
import LatestActivity from "../shared/LatestActivity";
import PluginUpgrade from "../shared/PluginUpgrade";
import RefreshControl from "../shared/RefreshControl";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Card() {
  const { presentContent } = useIntercom();
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const {
    data: purchases,
    refetch: refetchPurchases,
    isPending,
  } = useQuery({
    queryKey: ["activity", "card"],
    queryFn: () => getActivity({ include: "card" }),
  });

  const { queryKey } = useMarketAccount(marketUSDCAddress);
  const { address } = useAccount();
  const { data: KYCStatus, refetch: refetchKYCStatus } = useQuery({ queryKey: ["kyc", "status"], queryFn: kycStatus });
  const { refetch: refetchInstalledPlugins } = useReadUpgradeableModularAccountGetInstalledPlugins({
    address: address ?? zeroAddress,
  });

  const { data: markets, refetch: refetchMarkets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  let usdBalance = 0n;
  if (markets) {
    for (const market of markets) {
      if (market.floatingDepositAssets > 0n) {
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / 10n ** BigInt(market.decimals);
      }
    }
  }

  const { data: cardDetails, refetch: refetchCard } = useQuery({
    queryKey: ["card", "details"],
    queryFn: getCard,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const {
    mutateAsync: revealCard,
    isPending: isRevealing,
    error: revealError,
  } = useMutation({
    mutationKey: ["card", "reveal"],
    mutationFn: async function handleReveal() {
      if (!passkey || isRevealing) return;
      try {
        const { isSuccess, data } = await refetchCard();
        if (isSuccess && data.url) {
          setCardDetailsOpen(true);
          return;
        }
        await kycStatus();
        await createCard();
        const { data: card } = await refetchCard();
        if (card?.url) setCardDetailsOpen(true);
      } catch (error) {
        if (!(error instanceof APIError)) {
          handleError(error);
          return;
        }
        const { code, text } = error;
        if ((code === 403 && text === "kyc required") || (code === 404 && text === "kyc not found")) {
          await verifyIdentity(passkey);
        }
        if (code === 404 && text === "card not found") {
          await createCard();
          const { data: card } = await refetchCard();
          if (card?.url) setCardDetailsOpen(true);
        }
        handleError(error);
      }
    },
  });
  return (
    <SafeView fullScreen tab backgroundColor="$backgroundSoft">
      <View fullScreen backgroundColor="$backgroundMild">
        <ScrollView
          backgroundColor="$backgroundMild"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              backgroundColor="$backgroundSoft"
              margin={-5}
              refreshing={isPending}
              onRefresh={() => {
                refetchCard().catch(handleError);
                refetchPurchases().catch(handleError);
                refetchMarkets().catch(handleError);
                refetchKYCStatus().catch(handleError);
                refetchInstalledPlugins().catch(handleError);
                queryClient.refetchQueries({ queryKey }).catch(handleError);
              }}
            />
          }
        >
          <View fullScreen>
            <View flex={1}>
              <View alignItems="center" gap="$s5" width="100%" backgroundColor="$backgroundSoft" padded>
                <XStack gap={ms(10)} justifyContent="space-between" alignItems="center" width="100%">
                  <Text fontSize={ms(20)} fontWeight="bold">
                    My Exa Card
                  </Text>
                  <View display="flex" flexDirection="row" alignItems="center" gap={16}>
                    <Pressable onPress={toggle} hitSlop={ms(15)}>
                      {hidden ? <EyeOff color="$uiNeutralPrimary" /> : <Eye color="$uiNeutralPrimary" />}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        presentContent("9994746").catch(handleError);
                      }}
                      hitSlop={ms(15)}
                    >
                      <Info color="$uiNeutralPrimary" />
                    </Pressable>
                  </View>
                </XStack>
                {(usdBalance === 0n || KYCStatus !== "ok") && (
                  <InfoBadge
                    title="Your card is awaiting activation. Follow the steps to enable it."
                    actionText="Get started"
                    onPress={() => {
                      router.push("/getting-started");
                    }}
                  />
                )}
                <PluginUpgrade />
                <ExaCard
                  revealing={isRevealing}
                  disabled={!cardDetails}
                  frozen={cardDetails?.status === "FROZEN"}
                  onPress={() => {
                    if (isRevealing) return;
                    revealCard().catch(handleError);
                  }}
                />
                {revealError && (
                  <Text color="$uiErrorPrimary" fontWeight="bold">
                    {revealError.message}
                  </Text>
                )}
              </View>
              <View padded gap="$s5">
                {cardDetails && cardDetails.mode > 0 && <SimulatePurchase installments={cardDetails.mode} />}
                <SpendingLimits />
                <LatestActivity activity={purchases} title="Latest purchases" />
              </View>
            </View>
          </View>
        </ScrollView>
        <CardDetails
          uri={cardDetails?.url}
          open={cardDetailsOpen}
          onClose={() => {
            setCardDetailsOpen(false);
          }}
        />
      </View>
    </SafeView>
  );
}
