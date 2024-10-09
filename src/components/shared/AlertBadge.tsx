import { ChevronRight, AlertTriangle } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text } from "tamagui";

import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";

export default function AlertBadge() {
  const { presentContent } = useIntercom();
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
        <AlertTriangle size={ms(32)} color="$interactiveOnBaseErrorDefault" />
      </View>

      <View gap={ms(10)} padding={ms(25)} flex={1}>
        <Text fontSize={ms(15)} color="$interactiveOnBaseErrorSoft">
          Some of your assets are at risk of being liquidated.
        </Text>
        <Pressable
          onPress={() => {
            presentContent("9975910").catch(handleError);
          }}
        >
          <View flexDirection="row" gap={ms(2)} alignItems="center">
            <Text color="$interactiveOnBaseErrorSoft" fontSize={ms(15)} lineHeight={18} fontWeight="bold">
              Learn more
            </Text>
            <ChevronRight size={ms(14)} color="$interactiveOnBaseErrorSoft" fontWeight="bold" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
