import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { CircleHelp, Eye, EyeOff } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, RefreshControl } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, useTheme, XStack } from "tamagui";
import { zeroAddress } from "viem";

import Empty from "./Empty";
import NextPayment from "./NextPayment";
import PaymentSheet from "./PaymentSheet";
import UpcomingPayments from "./UpcomingPayments";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useAsset from "../../utils/useAsset";
import useIntercom from "../../utils/useIntercom";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Payments() {
  const theme = useTheme();
  const { presentArticle } = useIntercom();
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const { market, account } = useAsset(marketUSDCAddress);
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  const { refetch, isPending } = useReadPreviewerExactly({ address: previewerAddress, args: [account ?? zeroAddress] });
  let usdDue = 0n;
  if (market) {
    for (const { position } of market.fixedBorrowPositions.filter(({ previewValue }) => previewValue !== 0n)) {
      usdDue += ((position.principal + position.fee) * market.usdPrice) / 10n ** BigInt(market.decimals);
    }
  }
  const style = { backgroundColor: theme.backgroundSoft.val, margin: -5 };
  return (
    <SafeView fullScreen tab backgroundColor="$backgroundSoft">
      <View fullScreen backgroundColor="$backgroundMild">
        <ScrollView
          showsVerticalScrollIndicator={false}
          flex={1}
          backgroundColor={usdDue === 0n ? "$backgroundSoft" : "$backgroundMild"}
          refreshControl={
            <RefreshControl
              style={style}
              refreshing={isPending}
              onRefresh={() => {
                refetch().catch(handleError);
                queryClient.refetchQueries({ queryKey: ["activity"] }).catch(handleError);
              }}
            />
          }
        >
          {usdDue === 0n ? (
            <Empty />
          ) : (
            <>
              <View padded backgroundColor="$backgroundSoft">
                <XStack gap={ms(10)} justifyContent="space-between" alignItems="center">
                  <Text fontSize={ms(20)} fontWeight="bold">
                    Next Payment Due
                  </Text>
                  <XStack alignItems="center" gap={16}>
                    <Pressable onPress={toggle} hitSlop={ms(15)}>
                      {hidden ? (
                        <EyeOff size={24} color="$uiNeutralPrimary" />
                      ) : (
                        <Eye size={24} color="$uiNeutralPrimary" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        presentArticle("10245778").catch(handleError);
                      }}
                      hitSlop={ms(15)}
                    >
                      <CircleHelp size={24} color="$uiNeutralPrimary" />
                    </Pressable>
                  </XStack>
                </XStack>
                <NextPayment />
              </View>
              <View padded gap="$s6">
                <UpcomingPayments
                  onSelect={(maturity) => {
                    router.setParams({ maturity: maturity.toString() });
                    setPaySheetOpen(true);
                  }}
                />
              </View>
              <PaymentSheet
                open={paySheetOpen}
                onClose={() => {
                  setPaySheetOpen(false);
                }}
              />
            </>
          )}
        </ScrollView>
      </View>
    </SafeView>
  );
}
