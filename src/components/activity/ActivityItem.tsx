import { CircleDollarSign } from "@tamagui/lucide-icons";
import { getName, registerLocale, type LocaleData } from "i18n-iso-countries";
import React from "react";
import { ms } from "react-native-size-matters";
import { titleCase } from "title-case";

import type { getActivity } from "../../utils/server";
import Text from "../shared/Text";
import View from "../shared/View";

registerLocale(require("i18n-iso-countries/langs/en.json") as LocaleData); // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module

interface ActivityItemProperties {
  item: Awaited<ReturnType<typeof getActivity>>[number];
  isFirst: boolean;
  isLast: boolean;
}

export default function ActivityItem({ item, isFirst, isLast }: ActivityItemProperties) {
  const { amount, currency, id, merchant, usdAmount } = item;
  return (
    <View
      key={id}
      flexDirection="row"
      gap="$s4"
      alignItems="center"
      paddingHorizontal="$s5"
      paddingTop={isFirst ? "$s4" : "$s3"}
      paddingBottom={isLast ? "$s4" : "$s3"}
    >
      <View
        width={ms(40)}
        height={ms(40)}
        backgroundColor="$backgroundBrandMild"
        borderRadius="$r3"
        justifyContent="center"
        alignItems="center"
      >
        <CircleDollarSign color="$iconBrandDefault" />
      </View>
      <View flex={1} gap="$s2">
        <View flexDirection="row" justifyContent="space-between" alignItems="center" gap="$s4">
          <View gap="$s2" flexShrink={1}>
            <Text subHeadline color="$uiNeutralPrimary" numberOfLines={1}>
              {merchant.name}
            </Text>
            <Text caption color="$uiNeutralSecondary" numberOfLines={1}>
              {titleCase(
                [merchant.city, merchant.state, merchant.country && getName(merchant.country, "en")]
                  .filter((field) => field !== "null")
                  .filter(Boolean)
                  .join(", ")
                  .toLowerCase(),
              )}
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
              {Number(amount).toLocaleString(undefined, {
                currency: currency ?? undefined,
                currencyDisplay: "narrowSymbol",
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
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
