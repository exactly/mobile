import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl } from "react-native";
import { ScrollView } from "tamagui";

import handleError from "../../utils/handleError";
import { getActivity } from "../../utils/server";
import LatestActivity from "../shared/LatestActivity";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";
import View from "../shared/View";
import Balance from "./Balance";
import HomeActions from "./HomeActions";

export default function Home() {
  const {
    data: activity,
    isFetching,
    refetch: refetchActivity,
  } = useQuery({ queryFn: () => getActivity(), queryKey: ["activity"] });
  return (
    <SafeView fullScreen tab>
      <ProfileHeader />
      <ScrollView
        backgroundColor="$backgroundMild"
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              refetchActivity().catch(handleError);
            }}
            refreshing={isFetching}
          />
        }
      >
        <View flex={1} gap="$s4_5">
          <View backgroundColor="$backgroundSoft" gap="$s4" padded>
            <Balance />
            <HomeActions />
          </View>
          <View padded>{activity && activity.length > 0 && <LatestActivity activity={activity} />}</View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
