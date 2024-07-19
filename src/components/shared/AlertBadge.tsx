import { CaretRight, Warning } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native-gesture-handler";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

export default function AlertBadge() {
  const theme = useTheme();
  return (
    <View
      borderRadius={20}
      flexDirection="row"
      backgroundColor="$backgroundDanger"
      height={ms(112)}
      alignItems="center"
    >
      <View
        flex={1}
        height="100%"
        padding={ms(25)}
        backgroundColor="$interactiveBaseErrorDefault"
        justifyContent="center"
        alignItems="center"
        borderTopLeftRadius={20}
        borderBottomLeftRadius={20}
      >
        <Warning size={ms(32)} color={theme.backgroundDanger.get() as string} />
      </View>

      <View flex={12} gap={ms(10)} padding={ms(25)} width="100%">
        <Text fontSize={ms(15)} color="$interactiveOnBaseErrorSoft">
          Up to 10% of your total balance is at high risk of being liquidated.
        </Text>
        <TouchableOpacity>
          <View flexDirection="row" gap={ms(2)} alignItems="center">
            <Text color="$interactiveOnBaseErrorSoft" fontSize={ms(15)} lineHeight={18} fontWeight="bold">
              Manage
            </Text>
            <CaretRight size={14} color={theme.interactiveOnBaseErrorSoft.get() as string} weight="bold" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
