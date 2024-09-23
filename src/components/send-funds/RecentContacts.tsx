import type { Address } from "@exactly/common/types";
import { TimerReset } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack } from "tamagui";

import Contact from "./Contact";
import Text from "../shared/Text";
import View from "../shared/View";

export default function RecentContacts({ onContactPress }: { onContactPress: (address: Address) => void }) {
  const { data: recentContacts } = useQuery<{ address: Address; ens: string; lastUsed: Date }[] | undefined>({
    queryKey: ["contacts", "recent"],
  });
  return (
    <YStack gap="$s5">
      <XStack gap="$s2" alignItems="center">
        <TimerReset size={ms(20)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
        <Text emphasized footnote color="$uiNeutralSecondary">
          Recent Contacts
        </Text>
      </XStack>
      {recentContacts ? (
        <ScrollView maxHeight={ms(300)}>
          <View gap="$s3_5">
            {recentContacts.map((contact, index) => (
              <Contact key={index} contact={contact} onContactPress={onContactPress} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <View margin="$s2" borderRadius="$r3" backgroundColor="$uiNeutralTertiary" padding="$s3_5" alignSelf="center">
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            No recent contacts.
          </Text>
        </View>
      )}
    </YStack>
  );
}
