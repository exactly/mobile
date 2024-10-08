import { previewerAddress } from "@exactly/common/generated/chain";
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
import LatestActivity from "../shared/LatestActivity";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function Home() {
  const {
    data: activity,
    refetch: refetchActivity,
    isFetching,
  } = useQuery({ queryKey: ["activity"], queryFn: () => getActivity() });
  const { address } = useAccount();
  const { refetch: refetchMarkets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  return (
    <SafeView fullScreen tab>
      <ProfileHeader />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              refetchActivity().catch(handleError);
              refetchMarkets().catch(handleError);
            }}
          />
        }
        backgroundColor="$backgroundMild"
      >
        <View gap="$s4_5" flex={1}>
          <View backgroundColor="$backgroundSoft" padded gap="$s4">
            <Balance />
            <HomeActions />
          </View>
          <View padded>{activity && activity.length > 0 && <LatestActivity activity={activity} />}</View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
