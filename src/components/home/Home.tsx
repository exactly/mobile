import { previewerAddress } from "@exactly/common/generated/chain";
import { healthFactor, WAD } from "@exactly/lib";
import { TimeToFullDisplay } from "@sentry/react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { RefreshControl } from "react-native";
import { ScrollView, useTheme } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Balance from "./Balance";
import CardLimits from "./CardLimits";
import CardStatus from "./CardStatus";
import GettingStarted from "./GettingStarted";
import HomeActions from "./HomeActions";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import { getActivity, getKYCStatus } from "../../utils/server";
import PaymentSheet from "../pay-later/PaymentSheet";
import UpcomingPayments from "../pay-later/UpcomingPayments";
import LatestActivity from "../shared/LatestActivity";
import LiquidationAlert from "../shared/LiquidationAlert";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

const HEALTH_FACTOR_THRESHOLD = (WAD * 11n) / 10n;

export default function Home() {
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const theme = useTheme();
  const {
    data: activity,
    refetch: refetchActivity,
    isPending: isPendingActivity,
  } = useQuery({ queryKey: ["activity"], queryFn: () => getActivity() });
  const { address } = useAccount();
  const {
    data: markets,
    refetch: refetchMarkets,
    isPending: isPendingPreviewer,
  } = useReadPreviewerExactly({ address: previewerAddress, args: [address ?? zeroAddress] });
  const { data: KYCStatus, refetch: refetchKYCStatus } = useQuery({
    queryKey: ["kyc", "status"],
    queryFn: getKYCStatus,
  });
  let usdBalance = 0n;
  if (markets) {
    for (const market of markets) {
      if (market.floatingDepositAssets > 0n) {
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / 10n ** BigInt(market.decimals);
      }
    }
  }
  const isPending = isPendingActivity || isPendingPreviewer;
  const style = { backgroundColor: theme.backgroundSoft.val, margin: -5 };
  return (
    <SafeView fullScreen tab backgroundColor="$backgroundSoft">
      <View fullScreen backgroundColor="$backgroundMild">
        <ScrollView
          backgroundColor="$backgroundMild"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              style={style}
              refreshing={isPending}
              onRefresh={() => {
                refetchActivity().catch(handleError);
                refetchMarkets().catch(handleError);
                refetchKYCStatus().catch(handleError);
              }}
            />
          }
        >
          <ProfileHeader />
          <View flex={1}>
            <View backgroundColor="$backgroundSoft" padded gap="$s4">
              {markets && healthFactor(markets) < HEALTH_FACTOR_THRESHOLD && <LiquidationAlert />}
              <CardLimits />
              <HomeActions />
              <Balance usdBalance={usdBalance} />
            </View>
            <View backgroundColor="cardCreditBackground" padded>
              <CardStatus />
            </View>
            <View padded gap="$s5">
              <GettingStarted hasFunds={usdBalance > 0n} hasKYC={KYCStatus === "ok"} />
              <UpcomingPayments
                onSelect={(maturity) => {
                  router.setParams({ maturity: maturity.toString() });
                  setPaySheetOpen(true);
                }}
              />
              <LatestActivity activity={activity} />
            </View>
          </View>
          <PaymentSheet
            open={paySheetOpen}
            onClose={() => {
              setPaySheetOpen(false);
            }}
          />
        </ScrollView>
        <TimeToFullDisplay record={!!markets && !!activity} />
      </View>
    </SafeView>
  );
}
