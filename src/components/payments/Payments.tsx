import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import ContractUtils from "./ContractUtils";
import PasskeyUtils from "./PasskeyUtils";
import WalletUtils from "./WalletUtils";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function Payments() {
  return (
    <SafeView fullScreen tab>
      <ScrollView>
        <View fullScreen padded>
          <View gap={ms(20)} flex={1}>
            <WalletUtils />
            <PasskeyUtils />
            <ContractUtils />
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
