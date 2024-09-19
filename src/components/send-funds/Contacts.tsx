import type { Address } from "@exactly/common/types";
import { BookUser } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack } from "tamagui";

import Contact from "./Contact";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Contacts({ onContactPress }: { onContactPress: (address: Address) => void }) {
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  return (
    <YStack gap="$s5">
      <XStack gap="$s2" alignItems="center">
        <BookUser size={ms(20)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
        <Text emphasized footnote color="$uiNeutralSecondary">
          Contacts
        </Text>
      </XStack>
      {savedContacts ? (
        <ScrollView maxHeight={ms(300)}>
          <View gap="$s3_5">
            {savedContacts.map((contact, index) => (
              <Contact key={index} contact={contact} onContactPress={onContactPress} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <View margin="$s2" borderRadius="$r3" backgroundColor="$uiNeutralTertiary" padding="$s3_5" alignSelf="center">
          <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
            No saved contacts.
          </Text>
        </View>
      )}
    </YStack>
  );
}
