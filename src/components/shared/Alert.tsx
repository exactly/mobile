import { Info } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

export default function Alert() {
  return (
    <View
      alignItems="center"
      backgroundColor="$backgroundSoft"
      borderColor="$borderSuccessSoft"
      borderRadius="$r3"
      borderWidth={1}
      flexDirection="row"
      gap={ms(10)}
      height={ms(41)}
      shadowColor="$interactiveOnBaseBrandDefault"
      shadowOffset={{ height: 2, width: 0 }}
      shadowRadius="$r3"
    >
      <View
        alignItems="center"
        backgroundColor="$interactiveBaseSuccessSoftDefault"
        borderBottomLeftRadius="$r3"
        borderTopLeftRadius="$r3"
        justifyContent="center"
        padding={ms(8)}
      >
        <Info color="$interactiveOnBaseSuccessSoft" size={ms(24)} />
      </View>

      <Text color="$uiSuccessPrimary" fontSize={ms(15)}>
        Wallet address copied!
      </Text>
    </View>
  );
}
