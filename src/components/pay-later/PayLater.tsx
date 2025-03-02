import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { router } from "expo-router";
import React, { useState } from "react";
import { RefreshControl } from "react-native";
import { ScrollView, useTheme } from "tamagui";
import { zeroAddress } from "viem";

import Header from "./Header";
import InstallmentsSelector from "./InstallmentsSelector";
import PaymentSheet from "./PaymentSheet";
import UpcomingPayments from "./UpcomingPayments";
import { useReadPreviewerExactly } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import useAsset from "../../utils/useAsset";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function PayLater() {
  const theme = useTheme();
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const { account } = useAsset(marketUSDCAddress);
  const { refetch, isPending } = useReadPreviewerExactly({ address: previewerAddress, args: [account ?? zeroAddress] });
  const style = { backgroundColor: theme.backgroundSoft.val, margin: -5 };
  return (
    <SafeView fullScreen tab backgroundColor="$backgroundSoft">
      <View fullScreen backgroundColor="$backgroundMild">
        <ScrollView
          showsVerticalScrollIndicator={false}
          flex={1}
          refreshControl={
            <RefreshControl
              style={style}
              refreshing={isPending}
              onRefresh={() => {
                refetch().catch(handleError);
                queryClient.refetchQueries({ queryKey: ["activity"] }).catch(handleError);
              }}
            />
          }
        >
          <>
            <View padded backgroundColor="$backgroundSoft">
              <Header />
            </View>
            <View padded gap="$s6">
              <InstallmentsSelector />
              <UpcomingPayments
                onSelect={(maturity) => {
                  router.setParams({ maturity: maturity.toString() });
                  setPaySheetOpen(true);
                }}
              />
            </View>
            <PaymentSheet
              open={paySheetOpen}
              onClose={() => {
                setPaySheetOpen(false);
              }}
            />
          </>
        </ScrollView>
      </View>
    </SafeView>
  );
}
