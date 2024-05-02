import { BellSimpleRinging } from "@phosphor-icons/react";
import React from "react";
import { Stack, Text, View } from "tamagui";

import Button from "../components/Button";
import LinkButton from "../components/LinkButton";
import Switch from "../components/Switch";

const NOTIFICATION_GROUPS = [
  {
    title: "Allow notifications",
    body: "Be the first to hear about news, features releases, and app updates.",
  },
  {
    title: "Announcements",
    body: "Be the first to hear about news, features releases, and app updates.",
  },
  {
    title: "Due reminders",
    body: "Avoid late fees on your active borrows.",
  },
  {
    title: "Price shifts",
    body: "Get notified on important price movements of your assets.",
  },
];

export default function Notifications() {
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
          Stay updated
        </Text>
        <Text textAlign="center" fontSize="15px" fontWeight="400" marginBottom="32px" color="$textPrimary">
          Customize notifications for what matters: new features, due reminders to avoid late fees, and major price
          shifts for your assets.
        </Text>
        <Button
          secondary
          width="100%"
          color="$interactiveOnBrandSoft"
          borderWidth={1}
          borderColor="$interactiveOnBrandSoft"
          padding="20px"
          borderRadius="8px"
          justifyContent="space-between"
          backgroundColor="transparent"
          fontSize="15px"
          height="60px"
          marginBottom="32px"
          actionIcon={<BellSimpleRinging size="24px" />}
        >
          Turn on notifications
        </Button>
        {NOTIFICATION_GROUPS.map(({ title, body }) => (
          <View
            key={title}
            display="flex"
            justifyContent="space-between"
            flexWrap="wrap"
            width="100%"
            flexDirection="row"
            borderBottomColor="#BBB"
            borderBottomWidth={1}
            paddingVertical="20px"
            gap="24px"
          >
            <View flex={1}>
              <Text fontSize="15px" fontWeight="600">
                {title}
              </Text>
              <Text fontSize="13px" fontWeight="400">
                {body}
              </Text>
            </View>
            <Switch />
          </View>
        ))}
      </View>
      <View width="100%" gap="24px">
        <LinkButton href="/onboarding/verify">Skip</LinkButton>
      </View>
    </Stack>
  );
}
