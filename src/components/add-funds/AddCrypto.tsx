import { ArrowLeft, Files, Info, QrCode, Share } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, Image } from "tamagui";

import OptimismImage from "../../assets/images/optimism.svg";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

function back() {
  router.back();
}

function about() {
  router.push("../onboarding/add-funds/add-crypto-about");
}

function finish() {
  router.replace("/(app)");
}

const supportedAssets = [
  {
    image: "https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=024",
    apr: 0.5,
    name: "Bitcoin",
    symbol: "BTC",
  },
  {
    image: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png?v=024",
    apr: 0.45,
    name: "Wrapped Bitcoin",
    symbol: "wBTC",
  },
  {
    image: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
    apr: 0.3,
    name: "USD Coin",
    symbol: "USDC",
  },
];

export default function AddCrypto() {
  const { canGoBack } = router;
  return (
    <SafeView>
      <BaseLayout width="100%" height="100%">
        <View gap={ms(20)} paddingVertical={ms(20)}>
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
              <Text color="$uiPrimary" fontSize={ms(15)} fontWeight="bold">
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
              borderRadius="$r3"
              flexDirection="row"
              backgroundColor="$backgroundSoft"
              height={ms(41)}
              alignItems="center"
              borderWidth={1}
              borderColor="$borderSuccessSoft"
              shadowOffset={{ width: 0, height: 2 }}
              shadowRadius="$r3"
              shadowColor="$interactiveOnBaseBrandDefault"
              gap={ms(10)}
            >
              <View
                padding={ms(8)}
                backgroundColor="$interactiveBaseSuccessSoftDefault"
                justifyContent="center"
                alignItems="center"
                borderTopLeftRadius="$r3"
                borderBottomLeftRadius="$r3"
              >
                <Info size={ms(24)} color="$interactiveOnBaseSuccessSoft" />
              </View>

              <Text fontSize={ms(15)} color="$uiSuccessPrimary">
                Wallet address copied!
              </Text>
            </View>
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
                  <Text fontSize={ms(18)} color="$uiPrimary" fontWeight="bold">
                    0xfdrc.exa.eth
                  </Text>
                  <Text fontSize={ms(14)} color="$uiNeutralSecondary" fontWeight="bold">
                    0x0d283d19...4d6afabef0
                  </Text>
                </View>
                <View gap={ms(10)} flexDirection="row">
                  <View
                    width={ms(24)}
                    height={ms(24)}
                    backgroundColor="$interactiveBaseBrandDefault"
                    borderRadius="$r2"
                    alignContent="center"
                    alignItems="center"
                    onPress={finish}
                  >
                    <QrCode size={ms(24)} color="$interactiveOnBaseBrandDefault" />
                  </View>
                  <Files size={ms(24)} color="$interactiveBaseBrandDefault" />
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
                const { image, apr, name, symbol } = asset;
                return (
                  <View key={index} flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
                    <View flexDirection="row" alignItems="center" gap={ms(10)}>
                      <Image src={image} alt={`${symbol} logo`} width={ms(32)} height={ms(32)} />
                      <Text fontSize={ms(18)} color="$uiPrimary" fontWeight="bold">
                        {symbol}
                      </Text>
                      <Text fontSize={ms(13)} color="$uiNeutralSecondary">
                        {name}
                      </Text>
                    </View>
                    <View>
                      <Text textAlign="right" fontSize={ms(18)} color="$uiBrandPrimary" fontWeight="bold">
                        {apr}%
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
              <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
                <View flexDirection="row" alignItems="center" gap={ms(10)}>
                  <OptimismImage />
                  <Text fontSize={ms(18)} color="$uiPrimary" fontWeight="bold">
                    Optimism
                  </Text>
                  <Text fontSize={ms(13)} color="$uiNeutralSecondary">
                    OP Mainnet
                  </Text>
                </View>
              </View>
              <View flex={1}>
                <Text color="$uiNeutralPlaceholder" lineHeight={ms(16)}>
                  Exa App runs on the OP Mainnet network. Sending assets on other networks may result in irreversible
                  loss of funds.{" "}
                  <Text color="$uiBrandSecondary" fontSize={ms(13)} fontWeight="bold" onPress={about}>
                    Learn more about adding funds.
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </BaseLayout>
    </SafeView>
  );
}
