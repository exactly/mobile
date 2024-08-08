import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, View } from "tamagui";

import ContractUtils from "./ContractUtils";
import PasskeyUtils from "./PasskeyUtils";
import WalletUtils from "./WalletUtils";
import SafeView from "../shared/SafeView";

export default function Payments() {
  return (
    <SafeView padding="$s5">
      <ScrollView>
        <View gap={ms(20)} flex={1}>
          <WalletUtils />
          <PasskeyUtils />
          <ContractUtils />
        </View>
      </ScrollView>
    </SafeView>
  );
}
