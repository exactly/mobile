import React from "react";
import { Image, Stack, Text, View } from "tamagui";

import onboarding1 from "../../assets/onboarding1.png";
import LinkButton from "../components/LinkButton";

export default function Status() {
  return (
    <Stack display="flex" flexDirection="column" height="100vh">
      <View flex={1} display="flex" justifyContent="space-around" alignItems="center">
        <Image src={onboarding1} width="465px" height="436px" />
      </View>
      <View paddingHorizontal="24px" display="flex" flexDirection="column" alignItems="stretch" marginBottom="24px">
        <Text color="$textTextBrand" textAlign="center" fontSize="28px" fontWeight="700" marginBottom="129px">
          Account created successfully!
        </Text>
        <LinkButton href="/onboarding/exa-tag">Start account setup</LinkButton>
      </View>
    </Stack>
  );
}
