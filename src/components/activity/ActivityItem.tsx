import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { getName, type LocaleData, registerLocale } from "i18n-iso-countries/index";
import React from "react";
import { ms } from "react-native-size-matters";
import { titleCase } from "title-case";

import type { getActivity } from "../../utils/server";

import Text from "../shared/Text";
import View from "../shared/View";

registerLocale(require("i18n-iso-countries/langs/en.json") as LocaleData); // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module

interface ActivityItemProperties {
  isFirst: boolean;
  isLast: boolean;
  item: Awaited<ReturnType<typeof getActivity>>[number];
}

export default function ActivityItem({ isFirst, isLast, item }: ActivityItemProperties) {
  const { amount, currency, id, timestamp, type, usdAmount } = item;
  return (
    <View
      alignItems="center"
      flexDirection="row"
      gap="$s4"
      key={id}
      paddingBottom={isLast ? "$s4" : "$s3"}
      paddingHorizontal="$s5"
      paddingTop={isFirst ? "$s4" : "$s3"}
    >
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
              {type === "card" &&
                titleCase(
                  [
                    item.merchant.city,
                    item.merchant.state,
                    item.merchant.country && getName(item.merchant.country, "en"),
                  ]
                    .filter((field) => field && field !== "null")
                    .join(", ")
                    .toLowerCase(),
                )}
              {type !== "card" && format(timestamp, "yyyy-MM-dd")}
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
}
