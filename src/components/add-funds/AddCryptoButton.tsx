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
  .filter(([symbol]) => symbol !== "USDC.e" && symbol !== "DAI")
  .map(([symbol, image]) => ({ symbol, image }));

function navigate() {
  router.push("../add-funds/add-crypto");
}

export default function AddCryptoButton() {
  return (
    <Pressable onPress={navigate}>
      <View borderWidth={1} borderRadius="$r5" borderColor="$borderNeutralSoft" padding={ms(16)} gap={ms(20)}>
        <View gap={ms(10)} flexDirection="row" alignItems="center">
          <View
            width={ms(50)}
            height={ms(50)}
            borderRadius="$r3"
            backgroundColor="$interactiveBaseBrandSoftDefault"
            justifyContent="center"
            alignItems="center"
          >
            <CubeWithCircles width={ms(24)} height={ms(24)} color="$iconBrandDefault" />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} fontWeight="bold">
              Cryptocurrency
            </Text>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary">
              Multiple assets on OP Mainnet.
            </Text>
          </View>
        </View>
        <View gap="$s5" flexDirection="row" justifyContent="flex-start" alignItems="flex-start" width="100%">
          <View borderRadius="$r3" gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary" fontWeight="bold">
              Network
            </Text>
            <View>
              <Optimism width={ms(24)} height={ms(24)} color="$iconBrandDefault" />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary" fontWeight="bold">
              Assets
            </Text>
            <XStack>
              {supportedAssets.map((asset, index) => {
                return (
                  <View key={asset.symbol} transform={[{ translateX: index * ms(10) * -0.5 }]}>
                    <AssetLogo uri={asset.image} width={ms(24)} height={ms(24)} />
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
