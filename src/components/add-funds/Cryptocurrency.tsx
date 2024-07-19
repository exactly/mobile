import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

import CubeWithCircles from "../../assets/images/cube-with-circles.svg";
import Optimism from "../../assets/images/optimism.svg";

export default function Cryptocurrency() {
  const theme = useTheme();
  return (
    <Pressable>
      <View borderWidth={1} borderRadius={16} borderColor="$borderNeutralSoft" padding={ms(16)} gap={ms(20)}>
        <View gap={ms(10)} flexDirection="row" alignItems="center">
          <View
            width={ms(50)}
            height={ms(50)}
            borderRadius={ms(8)}
            backgroundColor="$interactiveBaseBrandSoftDefault"
            justifyContent="center"
            alignItems="center"
          >
            <CubeWithCircles width={ms(24)} height={ms(24)} color={theme.iconBrand.get() as string} />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} color="$textPrimary" fontWeight="bold">
              Cryptocurrency
            </Text>
            <Text fontSize={ms(13)} color="$textSecondary">
              Multiple assets on OP Mainnet.
            </Text>
          </View>
        </View>
        <View gap={ms(10)} flexDirection="row" justifyContent="space-between" alignItems="flex-start" width="100%">
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Network
            </Text>
            <View>
              <Optimism width={ms(24)} height={ms(24)} color={theme.iconBrand.get() as string} />
            </View>
          </View>
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Assets
            </Text>
            <View>
              <Optimism width={ms(24)} height={ms(24)} color={theme.iconBrand.get() as string} />
            </View>
          </View>
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Fees
            </Text>
            <Text fontSize={ms(13)} color="$uiPrimary" fontWeight="bold">
              $0.010 - $0.035
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
