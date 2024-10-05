import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import React from "react";
import { RefreshControl } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";
import { zeroAddress } from "viem";

import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";
import NextPayment from "./NextPayment";
import UpcomingPayments from "./UpcomingPayments";

export default function Payments() {
  const { account, market } = useMarketAccount(marketUSDCAddress);
  const { isFetching, refetch } = useReadPreviewerExactly({
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
            onRefresh={() => {
              refetch().catch(handleError);
              queryClient.refetchQueries({ queryKey: ["activity"] }).catch(handleError);
            }}
            refreshing={isFetching}
          />
        }
      >
        <View backgroundColor="$backgroundSoft" gap="$s5" padded>
          <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
            <Text fontSize={ms(20)} fontWeight="bold">
              Payments
            </Text>
          </View>
          <View gap="$s8">
            <View gap="$s6">
              <View alignItems="center" flexDirection="column" justifyContent="center">
                <Text
                  fontFamily="$mono"
                  fontSize={ms(40)}
                  fontWeight="bold"
                  overflow="hidden"
                  sensitive
                  textAlign="center"
                >
                  {(Number(usdDue) / 1e18).toLocaleString(undefined, {
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                    style: "currency",
                  })}
                </Text>
              </View>
              <View alignItems="center" gap="$s3">
                <Text color="$uiNeutralSecondary" emphasized title3>
                  Total debt
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View gap="$s6" padded>
          <NextPayment />
          <UpcomingPayments />
        </View>
      </ScrollView>
    </SafeView>
  );
}
