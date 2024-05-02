import React from "react";
import { Input, Stack, Text, View } from "tamagui";

import LinkButton from "../components/LinkButton";

export default function ExaTag() {
  return (
    <Stack
      display="flex"
      flexDirection="column"
      height="100vh"
      paddingHorizontal="24px"
      paddingBottom="40px"
      justifyContent="space-between"
    >
      <View display="flex" flexDirection="column" paddingTop="96px" paddingBottom="32px">
        <Text color="$textBrandPrimary" textAlign="center" fontSize="22px" fontWeight="700" marginBottom="32px">
          Claim an Exa tag
        </Text>
        <Text textAlign="center" fontSize="15px" fontWeight="400" marginBottom="64px" color="$textPrimary">
          This will be your account unique identifier that anyone can send you crypto to.
        </Text>
        <Input
          borderColor="transparent"
          borderBottomColor="$borderMild"
          borderRadius={0}
          placeholder="account.exa.eth"
          fontSize="28px"
          fontWeight="400"
          textAlign="center"
        />
      </View>
      <View width="100%" gap="24px">
        <LinkButton href="/onboarding/profile-photo">Continue</LinkButton>
        <Text color="$interactiveTextBrandDefault" fontSize="13px" fontWeight="600" textAlign="center">
          Claim Exa Tag later
        </Text>
      </View>
    </Stack>
  );
}
