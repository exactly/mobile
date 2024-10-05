import chain from "@exactly/common/generated/chain";
import { ArrowLeft, Files, Info, Share as ShareIcon } from "@tamagui/lucide-icons";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Alert, Pressable, Share } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";
import { useAccount } from "wagmi";

import OptimismImage from "../../assets/images/optimism.svg";
import assetLogos from "../../utils/assetLogos";
import handleError from "../../utils/handleError";
import shortenAddress from "../../utils/shortenAddress";
import AssetLogo from "../shared/AssetLogo";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function back() {
  router.back();
}

function about() {
  router.push("../add-funds/add-crypto-about");
}

// TODO remove limitation for next release
const supportedAssets = Object.entries(assetLogos)
  .filter(([symbol]) => symbol !== "ETH" && symbol !== "USDC.e" && symbol !== "DAI")
  .map(([symbol, image]) => ({ image, symbol }));

export default function AddCrypto() {
  const { canGoBack } = router;
  const { address } = useAccount();
  function copy() {
    if (!address) return;
    setStringAsync(address).catch(handleError);
    Alert.alert("Address Copied", "Your wallet address has been copied to the clipboard.");
  }
  const share = useCallback(async () => {
    if (!address) return;
    await Share.share({ message: address, title: `Share ${chain.name} address` });
  }, [address]);
  return (
    <SafeView fullScreen>
      <View fullScreen gap={ms(20)} padded>
        <View gap={ms(20)}>
          <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
            {canGoBack() && (
              <Pressable onPress={back}>
                <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
              </Pressable>
            )}
            <View alignItems="center" flexDirection="row">
              <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                {`Add Funds / `}
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
          <View flex={1} gap={ms(20)}>
            <View
              borderBottomColor="$borderNeutralSoft"
              borderBottomWidth={1}
              flex={1}
              gap={ms(10)}
              paddingBottom={ms(20)}
            >
              <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                Your {chain.name} address
              </Text>
              <View alignItems="center" flexDirection="row" justifyContent="space-between">
                <View>
                  {address && (
                    <Text color="$uiNeutralSecondary" fontSize={ms(14)} fontWeight="bold">
                      {shortenAddress(address, 10, 10)}
                    </Text>
                  )}
                </View>
                <View flexDirection="row" gap={ms(10)}>
                  <Pressable hitSlop={ms(15)} onPress={copy}>
                    <Files color="$interactiveBaseBrandDefault" size={ms(24)} />
                  </Pressable>
                  <Pressable
                    hitSlop={ms(15)}
                    onPress={() => {
                      share().catch(handleError);
                    }}
                  >
                    <ShareIcon color="$interactiveBaseBrandDefault" size={ms(24)} />
                  </Pressable>
                </View>
              </View>
            </View>
            <View
              borderBottomColor="$borderNeutralSoft"
              borderBottomWidth={1}
              flex={1}
              gap="$s4"
              paddingBottom={ms(20)}
            >
              <View flexDirection="row" justifyContent="space-between">
                <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                  Supported Assets
                </Text>
              </View>
              {supportedAssets.map((asset, index) => {
                return (
                  <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between" key={index}>
                    <View alignItems="center" flexDirection="row" gap={ms(10)}>
                      <AssetLogo height={ms(32)} uri={asset.image} width={ms(32)} />
                      <Text fontSize={ms(18)} fontWeight="bold">
                        {asset.symbol}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View flex={1} gap={ms(15)}>
              <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                Network
              </Text>
              <View
                alignItems="center"
                alignSelf="stretch"
                flexDirection="row"
                gap={ms(10)}
                justifyContent="space-between"
              >
                <View alignItems="center" flexDirection="row" flexGrow={1} gap={ms(10)} maxHeight={ms(32)}>
                  <OptimismImage height={ms(32)} width={ms(32)} />
                  <Text fontSize={ms(18)} fontWeight="bold">
                    {chain.name}
                  </Text>
                </View>
              </View>
              <View flex={1}>
                <Text color="$uiNeutralPlaceholder" fontSize={ms(13)} lineHeight={ms(16)} textAlign="justify">
                  Exa App runs on the {chain.name} network. Sending assets on other networks may result in irreversible
                  loss of funds.
                  <Text
                    color="$uiBrandSecondary"
                    fontSize={ms(13)}
                    fontWeight="bold"
                    lineHeight={ms(16)}
                    onPress={about}
                  >
                    &nbsp;Learn more about adding funds.
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
