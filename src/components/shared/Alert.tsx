import { Info } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text } from "tamagui";

export default function Alert() {
  return (
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
  );
}
