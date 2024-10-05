import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useMemo } from "react";
import { FlatList, RefreshControl } from "react-native";
import { ms } from "react-native-size-matters";

import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getActivity } from "../../utils/server";
import useMarketAccount from "../../utils/useMarketAccount";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";
import ActivityItem from "./ActivityItem";

export default function Activity() {
  const { data: activity, isFetching, refetch } = useQuery({ queryFn: () => getActivity(), queryKey: ["activity"] });
  const { queryKey } = useMarketAccount();
  const groupedActivity = useMemo(() => {
    if (!activity) return [];
    const groups: Record<string, typeof activity> = {};
    for (const item of activity) {
      const date = format(item.timestamp, "yyyy-MM-dd");
      groups[date] = groups[date] ?? [];
      groups[date].push(item);
    }
    return Object.entries(groups).map(([date, purchases]) => ({ date, purchases }));
  }, [activity]);
  return (
    <SafeView fullScreen tab>
      <View fullScreen>
        <View backgroundColor="$backgroundSoft" gap="$s5" padded>
          <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
            <Text fontSize={ms(20)} fontWeight="bold">
              All Activity
            </Text>
          </View>
        </View>
        <View flex={1} gap="$s5">
          <FlatList
            data={groupedActivity}
            keyExtractor={(item) => item.date}
            ListEmptyComponent={
              <View
                alignSelf="center"
                backgroundColor="$uiNeutralTertiary"
                borderRadius="$r3"
                margin="$s5"
                padding="$s3_5"
              >
                <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
                  There is no activity yet.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => {
                  refetch().catch(handleError);
                  queryClient.refetchQueries({ queryKey }).catch(handleError);
                }}
                refreshing={isFetching}
              />
            }
            renderItem={({ item }) => {
              const { date, purchases } = item;
              return (
                <View key={date}>
                  <View backgroundColor="$backgroundSoft" paddingHorizontal="$s5" paddingVertical="$s3">
                    <Text color="$uiNeutralSecondary" subHeadline>
                      {date}
                    </Text>
                  </View>
                  {purchases.map((purchase, index) => (
                    <ActivityItem
                      isFirst={index === 0}
                      isLast={index === purchases.length - 1}
                      item={purchase}
                      key={purchase.id}
                    />
                  ))}
                </View>
              );
            }}
          />
        </View>
      </View>
    </SafeView>
  );
}
