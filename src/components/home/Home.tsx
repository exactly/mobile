import { previewerAddress } from "@exactly/common/generated/chain";
import { healthFactor, WAD } from "@exactly/lib";
import { TimeToFullDisplay } from "@sentry/react-native";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ScrollView } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Balance from "./Balance";
import GettingStarted from "./GettingStarted";
import HomeActions from "./HomeActions";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import { getActivity, kycStatus } from "../../utils/server";
import AlertBadge from "../shared/AlertBadge";
import LatestActivity from "../shared/LatestActivity";
import ProfileHeader from "../shared/ProfileHeader";
import RefreshControl from "../shared/RefreshControl";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

const HEALTH_FACTOR_THRESHOLD = (WAD * 11n) / 10n;

export default function Home() {
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
  } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const {
    data: KYCStatus,
    error: KYCStatusError,
    refetch: refetchKYCStatus,
  } = useQuery({ queryKey: ["kyc", "status"], queryFn: kycStatus });

  let usdBalance = 0n;
  if (markets) {
    for (const market of markets) {
      if (market.floatingDepositAssets > 0n) {
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / 10n ** BigInt(market.decimals);
      }
    }
  }

  const isPending = isPendingActivity || isPendingPreviewer;
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
                refetchActivity().catch(handleError);
                refetchMarkets().catch(handleError);
                refetchKYCStatus().catch(handleError);
              }}
            />
          }
        >
          <ProfileHeader />
          <View gap="$s4_5" flex={1}>
            <View backgroundColor="$backgroundSoft" padded gap="$s4">
              {markets && healthFactor(markets) < HEALTH_FACTOR_THRESHOLD && <AlertBadge />}
              <Balance usdBalance={usdBalance} />
              <HomeActions />
            </View>
            <View padded gap="$s5">
              {(!KYCStatus || KYCStatusError) && <GettingStarted hasFunds={usdBalance > 0n} />}
              <LatestActivity activity={activity} />
            </View>
          </View>
        </ScrollView>
        <TimeToFullDisplay record={!!markets && !!activity} />
      </View>
    </SafeView>
  );
}
