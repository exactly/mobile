import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import { ms } from "react-native-size-matters";
import { Spinner } from "tamagui";

import ActivityItem from "./ActivityItem";
import { getActivity } from "../../utils/server";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Activity() {
  const { data: activity, isLoading } = useQuery({ queryKey: ["activity"], queryFn: getActivity });

  const groupedActivity = useMemo(() => {
    if (!activity) return [];
    const groups: Record<string, typeof activity> = {};
    for (const purchase of activity) {
      const date = format(purchase.timestamp, "yyyy-MM-dd");
      groups[date] = groups[date] ?? [];
      groups[date].push(purchase);
    }
    return Object.entries(groups).map(([date, purchases]) => ({ date, purchases }));
  }, [activity]);

  return (
    <SafeView fullScreen tab>
      <View fullScreen>
        <View padded gap="$s5" backgroundColor="$backgroundSoft">
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            <Text fontSize={ms(20)} fontWeight="bold">
              All Activity
            </Text>
          </View>
        </View>
        <View gap="$s5" flex={1}>
          {isLoading ? (
            <View margin="$s5" justifyContent="center" alignItems="center">
              <Spinner color="$interactiveBaseBrandDefault" />
            </View>
          ) : (
            <FlatList
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
              data={groupedActivity}
              renderItem={({ item }) => {
                const { date, purchases } = item;
                return (
                  <View key={date}>
                    <View paddingHorizontal="$s5" paddingVertical="$s3" backgroundColor="$backgroundSoft">
                      <Text subHeadline color="$uiNeutralSecondary">
                        {date}
                      </Text>
                    </View>
                    {purchases.map((purchase, index) => (
                      <ActivityItem
                        key={purchase.id}
                        item={purchase}
                        isFirst={index === 0}
                        isLast={index === purchases.length - 1}
                      />
                    ))}
                  </View>
                );
              }}
              keyExtractor={(item) => item.date}
            />
          )}
        </View>
      </View>
    </SafeView>
  );
}
