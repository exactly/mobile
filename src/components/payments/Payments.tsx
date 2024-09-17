import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import React from "react";
import { RefreshControl } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";
import { zeroAddress } from "viem";

import NextPayment from "./NextPayment";
import UpcomingPayments from "./UpcomingPayments";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useMarketAccount from "../../utils/useMarketAccount";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Payments() {
  const { market, account } = useMarketAccount(marketUSDCAddress);
  const { refetch, isFetching } = useReadPreviewerExactly({
    address: previewerAddress,
    args: [account ?? zeroAddress],
  });
  let usdDue = 0n;
  if (market) {
    for (const { position } of market.fixedBorrowPositions.filter(({ previewValue }) => previewValue !== 0n)) {
      usdDue += ((position.principal + position.fee) * market.usdPrice) / 10n ** BigInt(market.decimals);
    }
  }
  return (
    <SafeView fullScreen tab>
      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              refetch().catch(handleError);
            }}
          />
        }
      >
        <View padded gap="$s5" backgroundColor="$backgroundSoft">
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            <Text fontSize={ms(20)} fontWeight="bold">
              Payments
            </Text>
          </View>
          <View gap="$s8">
            <View gap="$s6">
              <View flexDirection="column" justifyContent="center" alignItems="center">
                <Text
                  sensitive
                  textAlign="center"
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                >
                  {(Number(usdDue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>
              </View>
              <View gap="$s3" alignItems="center">
                <Text emphasized title3 color="$uiNeutralSecondary">
                  Total debt
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View padded gap="$s6">
          <NextPayment />
          <UpcomingPayments />
        </View>
      </ScrollView>
    </SafeView>
  );
}
