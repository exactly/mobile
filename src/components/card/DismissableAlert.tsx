import { Info, X } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack } from "tamagui";

import Text from "../shared/Text";
import View from "../shared/View";

export default function DismissableAlert({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <XStack
      borderWidth={1}
      borderRadius="$r3"
      backgroundColor="$backgroundSoft"
      borderColor="$borderSuccessSoft"
      width="100%"
    >
      <View
        padding="$s4"
        backgroundColor="$interactiveBaseSuccessSoftDefault"
        justifyContent="center"
        alignItems="center"
        borderTopLeftRadius="$r3"
        borderBottomLeftRadius="$r3"
        flex={1}
      >
        <Info size={ms(24)} color="$interactiveOnBaseSuccessSoft" />
      </View>
      <View flex={6} padding="$s4">
        <Text fontSize={ms(15)} color="$uiSuccessPrimary" paddingRight="$s4">
          {text}
        </Text>
        <View
          position="absolute"
          right="$s3"
          top="$s3"
          backgroundColor="$interactiveBaseSuccessSoftDefault"
          borderRadius="$r_0"
          width={ms(24)}
          height={ms(24)}
          alignItems="center"
          justifyContent="center"
        >
          <Pressable hitSlop={ms(10)} onPress={onDismiss}>
            <X size={ms(18)} color="$interactiveOnBaseSuccessSoft" />
          </Pressable>
        </View>
      </View>
    </XStack>
  );
}
