import { PencilSimple } from "@phosphor-icons/react";
import React from "react";
import { Image, Stack, Text, View } from "tamagui";

import exactlyImage from "../../public/exactly.png";
import Button from "../components/Button";
import LinkButton from "../components/LinkButton";

export default function ProfilePhoto() {
  return (
    <Stack
      display="flex"
      flexDirection="column"
      height="100vh"
      paddingHorizontal="24px"
      paddingBottom="40px"
      justifyContent="space-between"
    >
      <View display="flex" flexDirection="column" paddingTop="96px" paddingBottom="32px" alignItems="center">
        <Text color="$textBrandPrimary" textAlign="center" fontSize="22px" fontWeight="700" marginBottom="32px">
          Add a profile photo
        </Text>
        <Text textAlign="center" fontSize="15px" fontWeight="400" marginBottom="64px" color="$textPrimary">
          Upload or select a photo to personalize your account.
        </Text>

        <View marginBottom="24px">
          <Image
            src="https://avatars.githubusercontent.com/u/83888950?s=200&v=4"
            alt="profile photo"
            width="120px"
            height="120px"
            borderRadius="$full"
          />

          <Button
            secondary
            borderRadius="$full"
            padding="8px"
            width="40px"
            height="40px"
            marginTop="-40px"
            marginLeft="80px"
            justifyContent="center"
            actionIcon={<PencilSimple size="24px" stroke="$interactiveOnBrandSoft" />}
          />
        </View>

        <Text
          borderRadius="$full"
          borderWidth="2px"
          borderColor="$borderBrandSoft"
          backgroundColor="$brandMild"
          paddingHorizontal="20px"
          paddingVertical="12px"
          color="$textBrandPrimary"
          fontSize="22px"
          fontWeight="400"
          display="flex"
          gap="8px"
        >
          0xfdrc <Image source={exactlyImage} alt="profile photo" width="24px" height="24px" />
        </Text>
      </View>
      <View width="100%" gap="24px">
        <LinkButton href="/onboarding/notifications">Continue</LinkButton>
      </View>
    </Stack>
  );
}
