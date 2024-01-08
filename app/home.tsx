import { Feather } from "@expo/vector-icons";
import React from "react";
import { Tabs, SizableText, YStack, XStack } from "tamagui";

import Card from "./card";
import ExaLogo from "../assets/exa-logo.svg";

export default function Home() {
  return (
    <YStack display="flex" height="100vh">
      <XStack paddingLeft={24} paddingRight={24} paddingTop={24} backgroundColor="white" justifyContent="space-between">
        <ExaLogo width={24} height={24} />
        <XStack gap={12}>
          <Feather name="bell" size={24} color="black" />
          <Feather name="settings" size={24} color="black" />
        </XStack>
      </XStack>
      <Tabs defaultValue="card" display="flex" flexDirection="column" flex={1}>
        <Tabs.Content value="card" flex={1}>
          <Card />
        </Tabs.Content>
        <Tabs.List>
          <Tabs.Tab value="card" flexShrink={0} flex={1}>
            <SizableText fontSize={10}>Card</SizableText>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </YStack>
  );
}
