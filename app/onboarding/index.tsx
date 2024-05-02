import React from "react";
import { Image, Stack, Text, View } from "tamagui";

import onboarding1 from "../../assets/onboarding1.png";
import LinkButton from "../components/LinkButton";
import PageIndicators from "../components/PageIndicators";

export default function Home() {
  return (
    <Stack display="flex" flexDirection="column" height="100vh">
      <View flex={1} display="flex" justifyContent="space-around" alignItems="center">
        <Image src={onboarding1} width="465px" height="436px" />
      </View>
      <View paddingHorizontal="24px" display="flex" flexDirection="column" alignItems="center" marginBottom="24px">
        <PageIndicators />

        <Text color="$textTextBrand" textAlign="center" fontSize="28px" fontWeight="700" marginBottom="96px">
          In-store QR payments, with crypto.
        </Text>
        <Text fontSize="11px" textAlign="center" color="$interactiveTextPlaceholder" marginBottom="16px">
          By continuing, I accept the Terms & Conditions.
        </Text>
        <View marginBottom="24px" width="100%">
          <LinkButton href="/onboarding/status">Create new account</LinkButton>
        </View>
        <Text color="$interactiveTextBrandDefault" fontSize="13px" fontWeight="600">
          Recover an existing account
        </Text>
      </View>
    </Stack>
  );
}
