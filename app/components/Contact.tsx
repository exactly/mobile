import { User, UserPlus } from "@phosphor-icons/react";
import React from "react";
import { Text, View } from "tamagui";

import Button from "./Button";

export default function Contact() {
  return (
    <View
      borderRadius="8px"
      flexDirection="row"
      backgroundColor="#F3FBF9"
      gap="12px"
      alignItems="center"
      marginBottom="16px"
    >
      <View backgroundColor="$interactiveBaseBrandDefault" borderRadius="$full" padding="4px" marginLeft="12px">
        <User size="24px" fill="#F3FBF9" />
      </View>
      <Text fontSize="16px" fontWeight="400" flex={1}>
        <Text color="$textSecondary">To: </Text>
        <Text fontWeight="600">0x0d283...afabef0</Text>
      </Text>
      <Button secondary actionIcon={<UserPlus size="24px" />} margin="4px" height="48px" />
    </View>
  );
}
