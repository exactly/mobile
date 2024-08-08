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
    <SafeView fullScreen paddingTop={0} backgroundColor="$backgroundSoft">
      <View fullScreen padded>
        <View display="flex" gap={ms(20)} flex={1} position="relative">
          <View
            backgroundColor="$backgroundMild"
            borderRadius="$r_0"
            height={ms(4)}
            left="50%"
            position="absolute"
            transform={[{ translateX: -ms(20) }]}
            width={ms(40)}
          />

          <View gap={ms(10)} justifyContent="space-between" flex={1}>
            <View gap={ms(10)}>
              <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
                Adding funds
              </Text>
              <Text fontSize={ms(16)} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                Your account is a self-custodial smart wallet on the OP Mainnet Network (Optimism). To fund your
                account, simply send any of the supported assets to your address.
              </Text>

              <Text fontSize={ms(11)} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                Exa App runs on OP Mainnet Network. Sending assets on other networks may result in irreversible loss of
                funds.{" "}
              </Text>
            </View>

            <Button
              main
              noFlex
              outlined
              spaced
              iconAfter={<X size={ms(20)} color="$interactiveOnBaseBrandSoft" fontWeight="bold" />}
              onPress={close}
            >
              Close
            </Button>
          </View>
        </View>
      </View>
    </SafeView>
  );
}
