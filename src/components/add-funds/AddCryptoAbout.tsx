import { X } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

import SafeView from "../shared/SafeView";
import StyledPressable from "../shared/StyledPressable";

const close = () => {
  router.back();
};

const AddCryptoAbout = () => {
  const theme = useTheme();
  return (
    <SafeView flex={1} flexDirection="column" alignItems="center" paddingTop={0}>
      <View
        flex={1}
        backgroundColor="$backgroundSoft"
        padding={ms(20)}
        borderTopLeftRadius="$r6"
        borderTopRightRadius="$r6"
      >
        <View display="flex" gap={ms(20)}>
          <View display="flex" flexDirection="row" justifyContent="flex-end" position="relative">
            <View
              position="absolute"
              height={ms(4)}
              width={ms(40)}
              borderRadius="$r_0"
              backgroundColor="$backgroundMild"
              left="50%"
              transform={[{ translateX: -ms(20) }]}
            />
          </View>

          <View flexDirection="column" gap={ms(40)} flex={1}>
            <View gap={ms(10)} justifyContent="space-between" flex={1}>
              <View gap={ms(10)}>
                <Text fontSize={ms(17)} fontWeight={700} color="$uiPrimary" textAlign="left">
                  Adding funds
                </Text>
                <Text fontSize={ms(16)} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  Your account is a self-custodial smart wallet on the OP Mainnet Network (Optimism). To fund your
                  account, simply send any of the supported assets to your address.
                </Text>

                <Text fontSize={ms(11)} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  Exa App runs on OP Mainnet Network. Sending assets on other networks may result in irreversible loss
                  of funds.{" "}
                </Text>
              </View>

              <StyledPressable onPress={close}>
                <View
                  flexDirection="row"
                  gap={ms(5)}
                  alignItems="center"
                  justifyContent="space-between"
                  backgroundColor="$interactiveBaseBrandSoftDefault"
                  padding={ms(20)}
                  borderRadius="$r3"
                >
                  <Text fontSize={ms(15)} fontWeight="bold" color={theme.interactiveOnBaseBrandSoft.get()}>
                    Close
                  </Text>
                  <X size={ms(20)} color={theme.interactiveOnBaseBrandSoft.val} fontWeight="bold" />
                </View>
              </StyledPressable>
            </View>
          </View>
        </View>
      </View>
    </SafeView>
  );
};

export default AddCryptoAbout;
