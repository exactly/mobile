import { AlertTriangle, ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

export default function AlertBadge() {
  return (
    <View
      alignItems="center"
      backgroundColor="$interactiveBaseErrorSoftDefault"
      borderRadius="$r6"
      flex={1}
      flexDirection="row"
      gap={ms(10)}
      justifyContent="space-between"
    >
      <View
        alignItems="center"
        backgroundColor="$interactiveBaseErrorDefault"
        borderBottomLeftRadius="$r6"
        borderTopLeftRadius="$r6"
        height="100%"
        justifyContent="center"
        padding={ms(25)}
        width="20%"
      >
        <AlertTriangle color="$interactiveOnBaseErrorDefault" size={ms(32)} />
      </View>

      <View flex={1} gap={ms(10)} padding={ms(25)}>
        <Text color="$interactiveOnBaseErrorSoft" fontSize={ms(15)}>
          Up to 10% of your total balance is at high risk of being liquidated.
        </Text>
        <Pressable>
          <View alignItems="center" flexDirection="row" gap={ms(2)}>
            <Text color="$interactiveOnBaseErrorSoft" fontSize={ms(15)} fontWeight="bold" lineHeight={18}>
              Manage
            </Text>
            <ChevronRight color="$interactiveOnBaseErrorSoft" fontWeight="bold" size={14} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
