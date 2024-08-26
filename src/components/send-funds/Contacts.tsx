import { BookUser } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import Text from "../shared/Text";

export default function Contacts() {
  return (
    <YStack gap="$s5">
      <XStack gap="$s2" alignItems="center">
        <BookUser size={ms(20)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
        <Text emphasized footnote color="$uiNeutralSecondary">
          Contacts
        </Text>
      </XStack>
      <Text emphasized footnote textAlign="center">
        No contacts available.
      </Text>
    </YStack>
  );
}
