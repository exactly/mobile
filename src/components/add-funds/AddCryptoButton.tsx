import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, XStack } from "tamagui";

import CubeWithCircles from "../../assets/images/cube-with-circles.svg";
import Optimism from "../../assets/images/optimism.svg";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";

// TODO remove limitation for next release
const supportedAssets = Object.entries(assetLogos)
  .filter(([symbol]) => symbol !== "ETH" && symbol !== "USDC.e" && symbol !== "DAI")
  .map(([symbol, image]) => ({ image, symbol }));

function navigate() {
  router.push("../add-funds/add-crypto");
}

export default function AddCryptoButton() {
  return (
    <Pressable onPress={navigate}>
      <View borderColor="$borderNeutralSoft" borderRadius="$r5" borderWidth={1} gap={ms(20)} padding={ms(16)}>
        <View alignItems="center" flexDirection="row" gap={ms(10)}>
          <View
            alignItems="center"
            backgroundColor="$interactiveBaseBrandSoftDefault"
            borderRadius="$r3"
            height={ms(50)}
            justifyContent="center"
            width={ms(50)}
          >
            <CubeWithCircles color="$iconBrandDefault" height={ms(24)} width={ms(24)} />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} fontWeight="bold">
              Cryptocurrency
            </Text>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)}>
              Multiple assets on OP Mainnet.
            </Text>
          </View>
        </View>
        <View alignItems="flex-start" flexDirection="row" gap="$s5" justifyContent="flex-start" width="100%">
          <View borderRadius="$r3" gap={ms(5)}>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} fontWeight="bold">
              Network
            </Text>
            <View>
              <Optimism color="$iconBrandDefault" height={ms(24)} width={ms(24)} />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} fontWeight="bold">
              Assets
            </Text>
            <XStack>
              {supportedAssets.map((asset, index) => {
                return (
                  <View key={asset.symbol} transform={[{ translateX: index * ms(10) * -0.5 }]}>
                    <AssetLogo height={ms(24)} uri={asset.image} width={ms(24)} />
                  </View>
                );
              })}
            </XStack>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
