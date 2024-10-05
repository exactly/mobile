import { marketUSDCAddress } from "@exactly/common/generated/chain";
import { Coins } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { formatDistance, intlFormat, isAfter } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";

import useMarketAccount from "../../utils/useMarketAccount";
import WAD from "../../utils/WAD";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  const { market: USDCMarket } = useMarketAccount(marketUSDCAddress);

  const usdDue = new Map<bigint, { position: bigint; previewValue: bigint }>();
  if (USDCMarket) {
    const { decimals, fixedBorrowPositions, usdPrice } = USDCMarket;
    for (const { maturity, position, previewValue } of fixedBorrowPositions) {
      if (!previewValue) continue;
      const preview = (previewValue * usdPrice) / 10n ** BigInt(decimals);
      const positionValue = ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
      usdDue.set(maturity, { position: positionValue, previewValue: preview });
    }
  }
  const maturity = usdDue.keys().next().value;
  const duePayment = usdDue.get(maturity ?? 0n);
  const discount = duePayment ? Number(WAD - (duePayment.previewValue * WAD) / duePayment.position) / 1e18 : 0;
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" gap="$s5" padding="$s4">
      {maturity ? (
        <>
          <View>
            <View alignItems="center" flexDirection="row" justifyContent="space-between">
              <Text
                color={
                  isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                }
                emphasized
                headline
              >
                {isAfter(new Date(Number(maturity) * 1000), new Date())
                  ? `Due in ${formatDistance(new Date(), new Date(Number(maturity) * 1000))}`
                  : `${formatDistance(new Date(Number(maturity) * 1000), new Date())} past due`}
              </Text>
            </View>
            <Text color="$uiNeutralSecondary" footnote>
              {intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" }).toUpperCase()}
            </Text>
          </View>
          {duePayment && (
            <View gap="$s5">
              <View alignItems="center" flexDirection="column" gap="$s4" justifyContent="center">
                {!hidden && (
                  <>
                    <Text
                      backgroundColor={
                        discount > 0 ? "$interactiveBaseSuccessSoftDefault" : "$interactiveBaseErrorSoftDefault"
                      }
                      caption2
                      color={discount > 0 ? "$uiSuccessSecondary" : "$uiErrorSecondary"}
                      padding="$s2"
                      pill
                    >
                      {discount > 0 ? "PAY NOW AND SAVE " : "DAILY PENALTIES "}
                      {(discount > 0 ? discount : discount * -1).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                        style: "percent",
                      })}
                    </Text>
                  </>
                )}

                {discount > 0 && (
                  <Text body color="$uiNeutralSecondary" sensitive strikeThrough>
                    {(Number(duePayment.position) / 1e18).toLocaleString(undefined, {
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                      style: "currency",
                    })}
                  </Text>
                )}
                <Text
                  color={
                    isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                  }
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                  sensitive
                  textAlign="center"
                >
                  {(Number(duePayment.previewValue) / 1e18).toLocaleString(undefined, {
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                    style: "currency",
                  })}
                </Text>
              </View>
              <View
                alignItems="center"
                display="flex"
                flexDirection="row"
                gap={ms(10)}
                justifyContent="center"
                paddingVertical={ms(10)}
              >
                <Button
                  contained
                  halfWidth
                  iconAfter={<Coins color="$interactiveOnBaseBrandDefault" />}
                  main
                  onPress={() => {
                    router.push("/pay");
                  }}
                  spaced
                >
                  Pay
                </Button>
              </View>
            </View>
          )}
        </>
      ) : (
        <View>
          <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
            There are no fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}
