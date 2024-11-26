import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import { ms } from "react-native-size-matters";
import { styled } from "tamagui";

import ActivityItem from "./ActivityItem";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getActivity } from "../../utils/server";
import useMarketAccount from "../../utils/useMarketAccount";
import RefreshControl from "../shared/RefreshControl";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Activity() {
  const { data: activity, refetch, isPending } = useQuery({ queryKey: ["activity"], queryFn: () => getActivity() });
  const { queryKey } = useMarketAccount();
  const groupedActivity = useMemo(() => {
    if (!activity) return [];
    const groups: Record<string, typeof activity> = {};
    for (const item of activity) {
      const date = format(item.timestamp, "yyyy-MM-dd");
      groups[date] = groups[date] ?? [];
      groups[date].push(item);
    }
    return Object.entries(groups).map(([date, events]) => ({ date, events }));
  }, [activity]);

  const data = groupedActivity.flatMap(({ date, events }) => [
    { type: "header" as const, date },
    ...events.map((event) => ({ type: "event" as const, event })),
  ]);

  return (
    <SafeView fullScreen tab backgroundColor="$backgroundSoft">
      <View gap="$s5" flex={1} backgroundColor="$backgroundMild">
        <StyledFlatList
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              backgroundColor="$backgroundSoft"
              margin={-5}
              refreshing={isPending}
              onRefresh={() => {
                refetch().catch(handleError);
                queryClient.refetchQueries({ queryKey }).catch(handleError);
              }}
            />
          }
          ListHeaderComponent={
            <View padded gap="$s5" backgroundColor="$backgroundSoft">
              <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
                <Text fontSize={ms(20)} fontWeight="bold">
                  All Activity
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View
              margin="$s5"
              borderRadius="$r3"
              backgroundColor="$uiNeutralTertiary"
              padding="$s3_5"
              alignSelf="center"
            >
              <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
                There is no activity yet.
              </Text>
            </View>
          }
          data={data}
          renderItem={({ item }) => {
            if (item.type === "header") {
              const { date } = item;
              return (
                <View paddingHorizontal="$s5" paddingVertical="$s3" backgroundColor="$backgroundSoft">
                  <Text subHeadline color="$uiNeutralSecondary">
                    {date}
                  </Text>
                </View>
              );
            }
            const { event } = item;
            return (
              <ActivityItem
                key={event.id}
                item={event}
                isLast={
                  data.findIndex(
                    (activityItem) => activityItem.type === "event" && activityItem.event.id === event.id,
                  ) ===
                  data.length - 1
                }
              />
            );
          }}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          stickyHeaderIndices={data.flatMap((item, index) => (item.type === "header" ? [index + 1] : []))}
        />
      </View>
    </SafeView>
  );
}

type ActivityItemType =
  | {
      type: "header";
      date: string;
    }
  | {
      type: "event";
      event: Awaited<ReturnType<typeof getActivity>>[number];
    };
const StyledFlatList = styled(FlatList<ActivityItemType>, { backgroundColor: "$backgroundMild" });
