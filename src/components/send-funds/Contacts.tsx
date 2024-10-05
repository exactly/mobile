import type { Address } from "@exactly/common/validation";

import { BookUser } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import Text from "../shared/Text";
import View from "../shared/View";
import Contact from "./Contact";

export default function Contacts({ onContactPress }: { onContactPress: (address: Address) => void }) {
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  return (
    <YStack gap="$s5">
      <XStack alignItems="center" gap="$s2">
        <BookUser color="$interactiveBaseBrandDefault" fontWeight="bold" size={ms(20)} />
        <Text color="$uiNeutralSecondary" emphasized footnote>
          Contacts
        </Text>
      </XStack>
      {savedContacts ? (
        <View gap="$s3_5">
          {savedContacts.map((contact, index) => (
            <Contact contact={contact} key={index} onContactPress={onContactPress} />
          ))}
        </View>
      ) : (
        <View alignSelf="center" backgroundColor="$uiNeutralTertiary" borderRadius="$r3" margin="$s2" padding="$s3_5">
          <Text color="$uiNeutralSecondary" subHeadline textAlign="center">
            No saved contacts.
          </Text>
        </View>
      )}
    </YStack>
  );
}
