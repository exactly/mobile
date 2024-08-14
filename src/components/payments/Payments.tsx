import { CircleDollarSign, Coins, Info } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, styled, Switch } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import NextPayment from "./NextPayment";
import PaymentHistory from "./PaymentHistory";
import UpcomingPayments from "./UpcomingPayments";
import { previewerAddress, useReadPreviewerExactly } from "../../generated/contracts";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

const StyledAction = styled(View, {
  flex: 1,
  minHeight: ms(140),
  borderWidth: 1,
  padding: ms(16),
  borderRadius: 10,
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  justifyContent: "space-between",
  flexBasis: "50%",
});

const paymentsAmount = 6;

function manage() {
  router.push("/");
}

export default function Payments() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  let totalDebtUsdValue = 0n;

  if (markets) {
    for (const market of markets) {
      if (market.floatingBorrowAssets > 0n) {
        totalDebtUsdValue += (market.floatingBorrowAssets * market.usdPrice) / BigInt(10 ** market.decimals);
      }
    }
  }

  const formattedDebt = (Number(totalDebtUsdValue) / 1e18).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <SafeView fullScreen tab>
      <ScrollView flex={1}>
        <View padded gap="$s5" backgroundColor="$backgroundSoft">
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            <Text fontSize={ms(20)} fontWeight="bold">
              Payments
            </Text>
            <Pressable>
              <Info color="$uiNeutralPrimary" />
            </Pressable>
          </View>

          <View gap="$s8">
            <View gap="$s6">
              <View flexDirection="column" justifyContent="center" alignItems="center">
                <Text textAlign="center" fontFamily="$mono" fontSize={ms(40)} fontWeight="bold" overflow="hidden">
                  {formattedDebt}
                </Text>
              </View>
              <View gap="$s3" alignItems="center">
                <Text emphasized title3 color="$uiNeutralSecondary">
                  Total debt
                </Text>
                <Text pill caption2 backgroundColor="$interactiveDisabled" color="$uiNeutralSecondary">
                  IN {paymentsAmount} PAYMENTS
                </Text>
              </View>
            </View>

            <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
              <StyledAction>
                <Pressable>
                  <View gap={ms(10)}>
                    <Coins size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                    <Text fontSize={ms(15)}>Auto-pay</Text>
                    <Switch backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft">
                      <Switch.Thumb
                        animation="quicker"
                        backgroundColor="$backgroundSoft"
                        shadowColor="$uiNeutralPrimary"
                      />
                    </Switch>
                  </View>
                </Pressable>
              </StyledAction>
              <StyledAction>
                <Pressable onPress={manage}>
                  <View gap={ms(10)}>
                    <CircleDollarSign size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                    <Text fontSize={ms(15)}>Collateral</Text>
                    <Text color="$interactiveBaseBrandDefault" fontSize={ms(15)} fontWeight="bold">
                      Manage
                    </Text>
                  </View>
                </Pressable>
              </StyledAction>
            </View>
          </View>
        </View>

        <View padded gap="$s6">
          <NextPayment />
          <UpcomingPayments />
          <PaymentHistory />
        </View>
      </ScrollView>
    </SafeView>
  );
}
