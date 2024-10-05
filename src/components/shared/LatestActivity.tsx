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
  title?: string;
}

export default function LatestActivity({ activity, title = "Latest activity" }: LatestActivityProperties) {
  return (
    <InfoCard
      renderAction={
        <Pressable
          hitSlop={ms(15)}
          onPress={() => {
            router.push("/activity");
          }}
        >
          <View alignItems="center" flexDirection="row" gap="$s1">
            <Text color="$interactiveTextBrandDefault" emphasized fontWeight="bold" footnote>
              View all
            </Text>
            <ChevronRight color="$interactiveTextBrandDefault" fontWeight="bold" size={ms(14)} />
          </View>
        </Pressable>
      }
      title={title}
    >
      {activity.slice(0, 4).map((item) => {
        const { amount, currency, id, timestamp, type, usdAmount } = item;
        return (
          <View alignItems="center" flexDirection="row" gap="$s4" key={id}>
            <View
              alignItems="center"
              backgroundColor="$backgroundBrandMild"
              borderRadius="$r3"
              height={ms(40)}
              justifyContent="center"
              width={ms(40)}
            >
              {type === "card" && <CircleDollarSign color="$iconBrandDefault" />}
              {type === "received" && <ArrowDownToLine color="$iconBrandDefault" />}
              {type === "sent" && <ArrowUpFromLine color="$iconBrandDefault" />}
            </View>
            <View flex={1} gap="$s2">
              <View alignItems="center" flexDirection="row" gap="$s4" justifyContent="space-between">
                <View flexShrink={1} gap="$s2">
                  <Text color="$uiNeutralPrimary" numberOfLines={1} subHeadline>
                    {type === "card" && item.merchant.name}
                    {type === "received" && "Received"}
                    {type === "sent" && "Sent"}
                  </Text>
                  <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
                    {format(timestamp, "yyyy-MM-dd")}
                  </Text>
                </View>
                <View gap="$s2">
                  <View alignItems="center" flexDirection="row" justifyContent="flex-end">
                    <Text fontSize={ms(15)} fontWeight="bold" sensitive textAlign="right">
                      {usdAmount > 0.01
                        ? usdAmount.toLocaleString(undefined, {
                            currency: "USD",
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                            style: "currency",
                          })
                        : `< ${(0.01).toLocaleString(undefined, {
                            currency: "USD",
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                            style: "currency",
                          })}`}
                    </Text>
                  </View>
                  <Text color="$uiNeutralSecondary" fontSize={ms(12)} sensitive textAlign="right">
                    {Number(amount).toLocaleString(undefined, {
                      maximumSignificantDigits: 2,
                      minimumSignificantDigits: 1,
                    })}
                    &nbsp;
                    {currency}
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
