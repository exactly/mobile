import { TimerReset } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import Text from "../shared/Text";

export default function RecentContacts() {
  return (
    <YStack gap="$s5" borderTopWidth={1} borderTopColor="$borderNeutralSoft">
      <XStack gap="$s2" alignItems="center" paddingTop="$s5">
        <TimerReset size={ms(20)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
        <Text emphasized footnote color="$uiNeutralSecondary">
          Recents
        </Text>
      </XStack>
      <Text emphasized footnote textAlign="center">
        No recent contacts.
      </Text>
    </YStack>
  );
}
