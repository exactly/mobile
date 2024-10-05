import type { Address } from "@exactly/common/validation";

import { TimerReset } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import Text from "../shared/Text";
import View from "../shared/View";
import Contact from "./Contact";

export default function RecentContacts({ onContactPress }: { onContactPress: (address: Address) => void }) {
  const { data: recentContacts } = useQuery<{ address: Address; ens: string; lastUsed: Date }[] | undefined>({
    queryKey: ["contacts", "recent"],
  });
  return (
    <YStack gap="$s5">
      <XStack alignItems="center" gap="$s2">
        <TimerReset color="$interactiveBaseBrandDefault" fontWeight="bold" size={ms(20)} />
        <Text color="$uiNeutralSecondary" emphasized footnote>
          Recents
        </Text>
      </XStack>
      {recentContacts ? (
        <View gap="$s3_5">
          {recentContacts.map((contact, index) => (
            <Contact contact={contact} key={index} onContactPress={onContactPress} />
          ))}
        </View>
      ) : (
        <View alignSelf="center" backgroundColor="$uiNeutralTertiary" borderRadius="$r3" margin="$s2" padding="$s3_5">
          <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
            No recent contacts.
          </Text>
        </View>
      )}
    </YStack>
  );
}
