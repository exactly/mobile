import { marketUSDCAddress } from "@exactly/common/generated/chain";
import { Coins } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { formatDistance, intlFormat, isAfter } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";

import WAD from "../../utils/WAD";
import useMarketAccount from "../../utils/useMarketAccount";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function NextPayment() {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  const { market: USDCMarket } = useMarketAccount(marketUSDCAddress);

  const usdDue = new Map<bigint, { previewValue: bigint; position: bigint }>();
  if (USDCMarket) {
    const { fixedBorrowPositions, usdPrice, decimals } = USDCMarket;
    for (const { maturity, previewValue, position } of fixedBorrowPositions) {
      if (!previewValue) continue;
      const preview = (previewValue * usdPrice) / 10n ** BigInt(decimals);
      const positionValue = ((position.principal + position.fee) * usdPrice) / 10n ** BigInt(decimals);
      usdDue.set(maturity, { previewValue: preview, position: positionValue });
    }
  }
  const maturity = usdDue.keys().next().value;
  const duePayment = usdDue.get(maturity ?? 0n);
  const discount = duePayment ? Number(WAD - (duePayment.previewValue * WAD) / duePayment.position) / 1e18 : 0;
  return (
    <View backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4" gap="$s5">
      {maturity ? (
        <>
          <View>
            <View flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text
                emphasized
                headline
                color={
                  isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                }
              >
                {isAfter(new Date(Number(maturity) * 1000), new Date())
                  ? `Due in ${formatDistance(new Date(), new Date(Number(maturity) * 1000))}`
                  : `${formatDistance(new Date(Number(maturity) * 1000), new Date())} past due`}
              </Text>
            </View>
            <Text footnote color="$uiNeutralSecondary">
              {intlFormat(new Date(Number(maturity) * 1000), { dateStyle: "medium" }).toUpperCase()}
            </Text>
          </View>
          {duePayment && (
            <View gap="$s5">
              <View flexDirection="column" justifyContent="center" alignItems="center" gap="$s4">
                {!hidden && (
                  <>
                    <Text
                      pill
                      caption2
                      padding="$s2"
                      backgroundColor={
                        discount > 0 ? "$interactiveBaseSuccessSoftDefault" : "$interactiveBaseErrorSoftDefault"
                      }
                      color={discount > 0 ? "$uiSuccessSecondary" : "$uiErrorSecondary"}
                    >
                      {discount > 0 ? "PAY NOW AND SAVE " : "DAILY PENALTIES "}
                      {(discount > 0 ? discount : discount * -1).toLocaleString(undefined, {
                        style: "percent",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </>
                )}

                {discount > 0 && (
                  <Text sensitive body strikeThrough color="$uiNeutralSecondary">
                    {(Number(duePayment.position) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                )}
                <Text
                  sensitive
                  textAlign="center"
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                  color={
                    isAfter(new Date(Number(maturity) * 1000), new Date()) ? "$uiNeutralPrimary" : "$uiErrorSecondary"
                  }
                >
                  {(Number(duePayment.previewValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
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
                <Button
                  onPress={() => {
                    router.push("/pay");
                  }}
                  contained
                  main
                  spaced
                  halfWidth
                  iconAfter={<Coins color="$interactiveOnBaseBrandDefault" />}
                >
                  Pay
                </Button>
              </View>
            </View>
          )}
        </>
      ) : (
        <View>
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            There are no fixed payments due.
          </Text>
        </View>
      )}
    </View>
  );
}
