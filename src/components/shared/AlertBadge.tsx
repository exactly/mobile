import { ChevronRight, AlertTriangle } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

export default function AlertBadge() {
  const theme = useTheme();
  return (
    <View
      borderRadius="$r6"
      flexDirection="row"
      backgroundColor="$interactiveBaseErrorSoftDefault"
      justifyContent="space-between"
      alignItems="center"
      gap={ms(10)}
      flex={1}
    >
      <View
        padding={ms(25)}
        backgroundColor="$interactiveBaseErrorDefault"
        justifyContent="center"
        alignItems="center"
        borderTopLeftRadius="$r6"
        borderBottomLeftRadius="$r6"
        width="20%"
        height="100%"
      >
        <AlertTriangle size={ms(32)} color={theme.interactiveOnBaseErrorDefault.get()} />
      </View>

      <View gap={ms(10)} padding={ms(25)} flex={1}>
        <Text fontSize={ms(15)} color="$interactiveOnBaseErrorSoft">
          Up to 10% of your total balance is at high risk of being liquidated.
        </Text>
        <Pressable>
          <View flexDirection="row" gap={ms(2)} alignItems="center">
            <Text color="$interactiveOnBaseErrorSoft" fontSize={ms(15)} lineHeight={18} fontWeight="bold">
              Manage
            </Text>
            <ChevronRight size={14} color={theme.interactiveOnBaseErrorSoft.get()} fontWeight="bold" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
