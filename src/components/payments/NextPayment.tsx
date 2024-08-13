import { Coins, FileText, IterationCw } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";

import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s5">
      <View>
        <View flexDirection="row" alignItems="center" justifyContent="space-between">
          <Text emphasized headline>
            Due in 12 days
          </Text>
          <Pressable>
            <View flexDirection="row" gap="$s2" alignItems="center">
              <Text emphasized footnote color="$interactiveTextBrandDefault">
                Statement
              </Text>
              <FileText size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
            </View>
          </Pressable>
        </View>
        <Text footnote color="$uiNeutralSecondary">
          DEC 27, 2024
        </Text>
      </View>
      <View gap="$s5">
        <View flexDirection="column" justifyContent="center" alignItems="center">
          <Text textAlign="center" fontFamily="$mono" fontSize={ms(40)} fontWeight="bold" overflow="hidden">
            {Number(3348.12).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              currencySign: "standard",
              currencyDisplay: "symbol",
            })}
          </Text>
        </View>
        <View flexDirection="row" gap="$s3" justifyContent="center">
          <Text subHeadline strikeThrough color="$uiNeutralSecondary">
            $3,481.94
          </Text>
          <Text
            pill
            caption2
            padding="$s2"
            backgroundColor="$interactiveBaseSuccessSoftDefault"
            color="$uiSuccessSecondary"
          >
            2.31% OFF
          </Text>
        </View>
        <View
          flexDirection="row"
          display="flex"
          gap={ms(10)}
          justifyContent="center"
          alignItems="center"
          paddingVertical={ms(10)}
        >
          <Button contained main spaced halfWidth iconAfter={<Coins color="$interactiveOnBaseBrandDefault" />}>
            Pay
          </Button>
          <Button outlined main spaced halfWidth iconAfter={<IterationCw color="$interactiveOnBaseBrandSoft" />}>
            Rollover
          </Button>
        </View>
      </View>
    </View>
  );
}
