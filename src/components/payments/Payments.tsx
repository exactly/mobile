import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, View } from "tamagui";

import ContractUtils from "./ContractUtils";
import PasskeyUtils from "./PasskeyUtils";
import WalletUtils from "./WalletUtils";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";

export default function Payments() {
  return (
    <SafeView>
      <ScrollView>
        <BaseLayout flex={1}>
          <View gap={ms(20)}>
            <Text fontSize={40} fontFamily="$mono" fontWeight="bold">
              Payments
            </Text>
            <WalletUtils />
            <PasskeyUtils />
            <ContractUtils />
          </View>
        </BaseLayout>
      </ScrollView>
    </SafeView>
  );
}
