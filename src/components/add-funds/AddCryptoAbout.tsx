import { X } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";

import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function close() {
  router.back();
}

export default function AddCryptoAbout() {
  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen paddingTop={0}>
      <View fullScreen gap="$s4" padded>
        <View flex={1} gap={ms(10)} justifyContent="space-between">
          <View gap={ms(10)}>
            <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
              Adding funds
            </Text>
            <Text color="$uiNeutralSecondary" fontSize={ms(16)} fontWeight={400} textAlign="left">
              Your account is a self-custodial smart wallet on OP Mainnet. To fund your account, simply send any of the
              supported assets to your address.
            </Text>
            <Text color="$uiNeutralSecondary" fontSize={ms(11)} fontWeight={400} textAlign="left">
              Exa App runs on OP Mainnet Network. Sending assets on other networks may result in irreversible loss of
              funds.
            </Text>
          </View>
          <Button
            iconAfter={<X color="$interactiveOnBaseBrandSoft" fontWeight="bold" size={ms(20)} />}
            main
            noFlex
            onPress={close}
            outlined
            spaced
          >
            Close
          </Button>
        </View>
      </View>
    </SafeView>
  );
}
