import { previewerAddress } from "@exactly/common/generated/chain";
import { healthFactor, WAD } from "@exactly/lib";
import { TimeToFullDisplay } from "@sentry/react-native";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl } from "react-native";
import { ScrollView } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Balance from "./Balance";
import HomeActions from "./HomeActions";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import { getActivity } from "../../utils/server";
import AlertBadge from "../shared/AlertBadge";
import LatestActivity from "../shared/LatestActivity";
import ProfileHeader from "../shared/ProfileHeader";
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

  const isPending = isPendingActivity || isPendingPreviewer;
  return (
    <SafeView fullScreen tab>
      <ProfileHeader />
      <ScrollView
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              refetchActivity().catch(handleError);
              refetchMarkets().catch(handleError);
            }}
            refreshing={isPending}
          />
        }
        backgroundColor="$backgroundMild"
      >
        <View gap="$s4_5" flex={1}>
          <View backgroundColor="$backgroundSoft" padded gap="$s4">
            {markets && healthFactor(markets) < HEALTH_FACTOR_THRESHOLD && <AlertBadge />}
            <Balance />
            <HomeActions />
          </View>
          <View padded>{activity && activity.length > 0 && <LatestActivity activity={activity} />}</View>
        </View>
      </ScrollView>
      <TimeToFullDisplay record={!!markets && !!activity} />
    </SafeView>
  );
}
