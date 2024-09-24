import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, CircleDollarSign } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";

import type { getActivity } from "../../utils/server";
import InfoCard from "../home/InfoCard";
import Text from "../shared/Text";
import View from "../shared/View";

interface LatestActivityProperties {
  activity: Awaited<ReturnType<typeof getActivity>>;
}

export default function LatestActivity({ activity }: LatestActivityProperties) {
  return (
    <InfoCard
      title="Latest activity"
      renderAction={
        <Pressable
          hitSlop={ms(15)}
          onPress={() => {
            router.push("/activity");
          }}
        >
          <View flexDirection="row" gap="$s1" alignItems="center">
            <Text color="$interactiveTextBrandDefault" emphasized footnote fontWeight="bold">
              View all
            </Text>
            <ChevronRight size={ms(14)} color="$interactiveTextBrandDefault" fontWeight="bold" />
          </View>
        </Pressable>
      }
    >
      {activity.slice(0, 4).map((item) => {
        const { amount, id, usdAmount, currency, type, timestamp } = item;
        return (
          <View key={id} flexDirection="row" gap="$s4" alignItems="center">
            <View
              width={ms(40)}
              height={ms(40)}
              backgroundColor="$backgroundBrandMild"
              borderRadius="$r3"
              justifyContent="center"
              alignItems="center"
            >
              {type === "card" && <CircleDollarSign color="$iconBrandDefault" />}
              {type === "received" && <ArrowDownToLine color="$iconBrandDefault" />}
              {type === "sent" && <ArrowUpFromLine color="$iconBrandDefault" />}
            </View>
            <View flex={1} gap="$s2">
              <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$s4">
                <View gap="$s2" flexShrink={1}>
                  <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1}>
                    {type === "card" && item.merchant.name}
                    {type === "received" && "Received"}
                    {type === "sent" && "Sent"}
                  </Text>
                  <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
                    {format(timestamp, "yyyy-MM-dd")}
                  </Text>
                </View>
                <View gap="$s2">
                  <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                    <Text sensitive fontSize={ms(15)} fontWeight="bold" textAlign="right">
                      {Number(usdAmount).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                  </View>
                  <Text sensitive fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                    {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </InfoCard>
  );
}
