import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, ShoppingCart } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import { getName, registerLocale, type LocaleData } from "i18n-iso-countries/index";
import React from "react";
import { ms } from "react-native-size-matters";
import { titleCase } from "title-case";

import type { ActivityItem as Item } from "../../utils/queryClient";
import queryClient from "../../utils/queryClient";
import Text from "../shared/Text";
import View from "../shared/View";

registerLocale(require("i18n-iso-countries/langs/en.json") as LocaleData); // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module

export default function ActivityItem({ item, isLast }: { item: Item; isLast: boolean }) {
  const { amount, id, usdAmount, currency, type, timestamp } = item;
  function handlePress() {
    queryClient.setQueryData(["activity", "details"], item);
    router.push({ pathname: "/activity-details" });
  }
  return (
    <View
      key={id}
      flexDirection="row"
      gap="$s4"
      alignItems="center"
      paddingHorizontal="$s5"
      paddingTop="$s3"
      paddingBottom={isLast ? "$s4" : "$s3"}
      onPress={handlePress}
    >
      <View
        width={ms(40)}
        height={ms(40)}
        backgroundColor="$backgroundStrong"
        borderRadius="$r3"
        justifyContent="center"
        alignItems="center"
      >
        {type === "card" && <ShoppingCart color="$uiNeutralPrimary" />}
        {type === "received" && <ArrowDownToLine color="$interactiveOnBaseSuccessSoft" />}
        {type === "sent" && <ArrowUpFromLine color="$interactiveOnBaseErrorSoft" />}
        {type === "repay" && <CircleDollarSign color="$interactiveOnBaseErrorSoft" />}
        {type === "panda" && <ShoppingCart color="$uiNeutralPrimary" />}
      </View>
      <View flex={1} gap="$s2">
        <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$s4">
          <View gap="$s2" flexShrink={1}>
            <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1}>
              {type === "card" && item.merchant.name}
              {type === "received" && "Received"}
              {type === "sent" && "Sent"}
              {type === "repay" && "Debt Paid"}
              {type === "panda" && item.merchant.name}
            </Text>
            <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
              {(type === "card" || type === "panda") &&
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
              {type !== "card" && type !== "panda" && format(timestamp, "yyyy-MM-dd")}
            </Text>
          </View>
          <View gap="$s2">
            <View flexDirection="row" alignItems="center" justifyContent="flex-end">
              <Text sensitive fontSize={ms(15)} fontWeight="bold" textAlign="right">
                {usdAmount > 0.01
                  ? usdAmount.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : `< ${(0.01).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </Text>
            </View>
            <Text sensitive fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
              {Number(amount).toLocaleString(undefined, {
                maximumFractionDigits: 8,
                minimumFractionDigits: 0,
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
