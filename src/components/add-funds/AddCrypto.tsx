import chain from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import { ArrowLeft, Files, Info, Share as ShareIcon } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Share } from "react-native";
import { ScrollView } from "tamagui";
import { useAccount } from "wagmi";

import OptimismImage from "../../assets/images/optimism.svg";
import assetLogos from "../../utils/assetLogos";
import reportError from "../../utils/reportError";
import AddressDialog from "../shared/AddressDialog";
import AssetLogo from "../shared/AssetLogo";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

// TODO remove limitation for next release
const supportedAssets = Object.entries(assetLogos)
  .filter(([symbol]) => symbol !== "USDC.e" && symbol !== "DAI")
  .map(([symbol, image]) => ({ symbol, image }));

export default function AddCrypto() {
  const [alertShown, setAlertShown] = useState(false);
  const toast = useToastController();
  const { address } = useAccount();
  const { canGoBack } = router;

  const copy = useCallback(() => {
    if (!address) return;
    setStringAsync(address).catch(reportError);
    toast.show("Account address copied!", {
      native: true,
      duration: 1000,
      burntOptions: { haptic: "success" },
    });
    setAlertShown(false);
  }, [address, toast]);

  const share = useCallback(async () => {
    if (!address) return;
    await Share.share({ message: address, title: `Share ${chain.name} address` });
  }, [address]);
  return (
    <SafeView fullScreen>
      <View gap={20} fullScreen padded>
        <View gap={20}>
          <View flexDirection="row" gap={10} justifyContent="space-between" alignItems="center">
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={24} color="$uiNeutralPrimary" />
              </Pressable>
            )}
            <View flexDirection="row" alignItems="center">
              <Text color="$uiNeutralSecondary" fontSize={15} fontWeight="bold">
                {`Add Funds / `}
              </Text>
              <Text fontSize={15} fontWeight="bold">
                Cryptocurrency
              </Text>
            </View>
            <Pressable>
              <Info color="$uiNeutralPrimary" />
            </Pressable>
          </View>
        </View>
        <ScrollView flex={1}>
          <View gap={20} flex={1}>
            <View flex={1} gap={10} borderBottomWidth={1} borderBottomColor="$borderNeutralSoft" paddingBottom={20}>
              <Text fontSize={15} color="$uiNeutralSecondary" fontWeight="bold">
                Your {chain.name} address
              </Text>
              <View flexDirection="row" justifyContent="space-between" alignItems="center">
                <View>
                  <Pressable
                    hitSlop={15}
                    onPress={() => {
                      setAlertShown(true);
                    }}
                  >
                    {address && (
                      <Text fontFamily="$mono" fontSize={18} color="$uiNeutralPrimary" fontWeight="bold">
                        {shortenHex(address)}
                      </Text>
                    )}
                  </Pressable>
                </View>
                <View gap={10} flexDirection="row">
                  <Pressable
                    onPress={() => {
                      setAlertShown(true);
                    }}
                    hitSlop={15}
                  >
                    <Files size={24} color="$interactiveBaseBrandDefault" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      share().catch(reportError);
                    }}
                    hitSlop={15}
                  >
                    <ShareIcon size={24} color="$interactiveBaseBrandDefault" />
                  </Pressable>
                </View>
              </View>
            </View>
            <AddressDialog
              open={alertShown}
              onActionPress={copy}
              onClose={() => {
                setAlertShown(false);
              }}
            />
            <View flex={1} gap="$s4" borderBottomWidth={1} borderBottomColor="$borderNeutralSoft" paddingBottom={20}>
              <View flexDirection="row" justifyContent="space-between">
                <Text fontSize={15} color="$uiNeutralSecondary" fontWeight="bold">
                  Supported Assets
                </Text>
              </View>
              {supportedAssets.map((asset, index) => {
                return (
                  <View key={index} flexDirection="row" gap={10} justifyContent="space-between" alignItems="center">
                    <View flexDirection="row" alignItems="center" gap={10}>
                      <AssetLogo uri={asset.image} width={32} height={32} />
                      <Text fontSize={18} fontWeight="bold">
                        {asset.symbol}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View flex={1} gap={15}>
              <Text fontSize={15} color="$uiNeutralSecondary" fontWeight="bold">
                Network
              </Text>
              <View flexDirection="row" gap={10} justifyContent="space-between" alignItems="center" alignSelf="stretch">
                <View flexDirection="row" alignItems="center" gap={10} flexGrow={1} maxHeight={32}>
                  <OptimismImage height={32} width={32} />
                  <Text fontSize={18} fontWeight="bold">
                    {chain.name}
                  </Text>
                </View>
              </View>
              <View flex={1}>
                <Text color="$uiNeutralPlaceholder" fontSize={13} lineHeight={16} textAlign="justify">
                  Exa App runs on the {chain.name} network. Sending assets on other networks may result in irreversible
                  loss of funds.
                  <Text
                    color="$uiBrandSecondary"
                    fontSize={13}
                    lineHeight={16}
                    fontWeight="bold"
                    onPress={() => {
                      router.push("../add-funds/add-crypto-about");
                    }}
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
