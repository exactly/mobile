import { CaretRight, Warning } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

export default function AlertBadge() {
  const theme = useTheme();
  return (
    <View
      borderRadius={20}
      flexDirection="row"
      backgroundColor="$backgroundDanger"
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
        borderTopLeftRadius={20}
        borderBottomLeftRadius={20}
        width="20%"
        height="100%"
      >
        <Warning size={ms(32)} color={theme.backgroundDanger.get() as string} />
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
            <CaretRight size={14} color={theme.interactiveOnBaseErrorSoft.get() as string} weight="bold" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
