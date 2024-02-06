import { Feather } from "@expo/vector-icons";
import React from "react";
import { Tabs, SizableText, YStack, XStack } from "tamagui";
import { useDisconnect } from "wagmi";

import Auth from "./auth";
import Card from "./create-card";
import RegisterUser from "./register-user";
import ExaLogo from "../assets/exa-logo.svg";

export default function Home() {
  const { disconnect } = useDisconnect();

  return (
    <YStack display="flex" height="100vh">
      <XStack paddingLeft={24} paddingRight={24} paddingTop={24} backgroundColor="white" justifyContent="space-between">
        <ExaLogo width={24} height={24} />
        <XStack gap={12}>
          <Feather name="bell" size={24} color="black" />
          <Feather name="settings" onPress={() => disconnect()} size={24} color="black" />
        </XStack>
      </XStack>
      <Tabs defaultValue="card" display="flex" flexDirection="column" flex={1}>
        <Tabs.Content value="card" flex={1}>
          <Card />
        </Tabs.Content>
        <Tabs.Content value="auth" flex={1}>
          <Auth />
        </Tabs.Content>
        <Tabs.Content value="user" flex={1}>
          <RegisterUser />
        </Tabs.Content>
        <Tabs.List>
          <Tabs.Tab value="card" flexShrink={0} flex={1}>
            <SizableText fontSize={10}>Card</SizableText>
          </Tabs.Tab>
          <Tabs.Tab value="auth" flexShrink={0} flex={1}>
            <SizableText fontSize={10}>auth</SizableText>
          </Tabs.Tab>
          <Tabs.Tab value="user" flexShrink={0} flex={1}>
            <SizableText fontSize={10}>User</SizableText>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </YStack>
  );
}
