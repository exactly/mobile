import { ArrowLeft, Files, Info, QrCode, Share } from "@tamagui/lucide-icons";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Image } from "tamagui";
import { useAccount } from "wagmi";

import OptimismImage from "../../assets/images/optimism.svg";
import handleError from "../../utils/handleError";
import shortenAddress from "../../utils/shortenAddress";
import symbolToIcon from "../../utils/symbolToIcon";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function back() {
  router.back();
}

function about() {
  router.push("../add-funds/add-crypto-about");
}

const supportedAssets = [{ image: symbolToIcon.USDC }];

export default function AddCrypto() {
  const { canGoBack } = router;
  const { address } = useAccount();
  function copy() {
    if (!address) return;
    setStringAsync(address).catch(handleError);
    Alert.alert("Address Copied", "Your wallet address has been copied to the clipboard.");
  }
  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View gap={ms(20)}>
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            {canGoBack() && (
              <Pressable onPress={back}>
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
            <View flexDirection="row" alignItems="center">
              <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                Add Funds /{" "}
              </Text>
              <Text fontSize={ms(15)} fontWeight="bold">
                Cryptocurrency
              </Text>
            </View>
            <Pressable>
              <Info color="$uiNeutralPrimary" />
            </Pressable>
          </View>
        </View>
        <ScrollView flex={1}>
          <View gap={ms(20)} flex={1}>
            <View
              flex={1}
              gap={ms(10)}
              borderBottomWidth={1}
              borderBottomColor="$borderNeutralSoft"
              paddingBottom={ms(20)}
            >
              <Text fontSize={ms(15)} color="$uiNeutralSecondary" fontWeight="bold">
                Your address
              </Text>
              <View flexDirection="row" justifyContent="space-between" alignItems="center">
                <View>
                  {address && (
                    <Text fontSize={ms(14)} color="$uiNeutralSecondary" fontWeight="bold">
                      {shortenAddress(address, 10, 10)}
                    </Text>
                  )}
                </View>
                <View gap={ms(10)} flexDirection="row">
                  <QrCode size={ms(24)} color="$interactiveBaseBrandDefault" />
                  <Pressable onPress={copy}>
                    <Files size={ms(24)} color="$interactiveBaseBrandDefault" />
                  </Pressable>
                  <Share size={ms(24)} color="$interactiveBaseBrandDefault" />
                </View>
              </View>
            </View>
            <View
              flex={1}
              gap={ms(15)}
              borderBottomWidth={1}
              borderBottomColor="$borderNeutralSoft"
              paddingBottom={ms(20)}
            >
              <View flexDirection="row" justifyContent="space-between">
                <Text fontSize={ms(15)} color="$uiNeutralSecondary" fontWeight="bold">
                  Supported Assets
                </Text>
                <Text fontSize={ms(15)} color="$uiNeutralSecondary" fontWeight="bold">
                  APR
                </Text>
              </View>
              {supportedAssets.map((asset, index) => {
                return (
                  <View key={index} flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
                    <View flexDirection="row" alignItems="center" gap={ms(10)}>
                      <Image src={asset.image} alt="Logo" width={ms(32)} height={ms(32)} />
                      <Text fontSize={ms(18)} fontWeight="bold">
                        USDC
                      </Text>
                      <Text fontSize={ms(13)} color="$uiNeutralSecondary">
                        USD Coin
                      </Text>
                    </View>
                    <View>
                      <Text textAlign="right" fontSize={ms(18)} color="$uiBrandPrimary" fontWeight="bold">
                        0%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View flex={1} gap={ms(15)}>
              <Text fontSize={ms(15)} color="$uiNeutralSecondary" fontWeight="bold">
                Network
              </Text>
              <View
                flexDirection="row"
                gap={ms(10)}
                justifyContent="space-between"
                alignItems="center"
                alignSelf="stretch"
              >
                <View flexDirection="row" alignItems="center" gap={ms(10)} flexGrow={1} maxHeight={ms(32)}>
                  <OptimismImage height={ms(32)} width={ms(32)} />
                  <Text fontSize={ms(18)} fontWeight="bold">
                    Optimism
                  </Text>
                  <Text fontSize={ms(13)} color="$uiNeutralSecondary">
                    OP Mainnet
                  </Text>
                </View>
              </View>
              <View flex={1}>
                <Text color="$uiNeutralPlaceholder" fontSize={ms(13)} lineHeight={ms(16)}>
                  Exa App runs on the OP Mainnet network. Sending assets on other networks may result in irreversible
                  loss of funds.{" "}
                  <Text
                    color="$uiBrandSecondary"
                    fontSize={ms(13)}
                    lineHeight={ms(16)}
                    fontWeight="bold"
                    onPress={about}
                  >
                    Learn more about adding funds.
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
