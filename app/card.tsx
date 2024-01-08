import { AntDesign, Entypo, Feather } from "@expo/vector-icons";
import React from "react";
import { Text, YStack, XStack, Button, Heading } from "tamagui";

export default function Card() {
  return (
    <YStack width="100%" backgroundColor="white" paddingLeft={24} paddingRight={24}>
      <Heading fontWeight="700" fontSize={16}>
        Balance
      </Heading>
      <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
        <XStack alignItems="center" gap={16}>
          <Text fontSize={32}>$100.00</Text>
          <AntDesign name="eyeo" size={24} />
        </XStack>
        <Entypo name="chevron-thin-down" size={20} />
      </XStack>
      <XStack alignItems="center" gap={4} marginBottom={24}>
        <Feather name="arrow-up-right" size={20} color="#8C8795" />
        <Text fontSize={14} fontWeight="500" color="#8C8795">
          $12.93 (8.71%) Last 7 days
        </Text>
      </XStack>

      <XStack width="100%" gap={8}>
        <Button flex={1}>Add Funds</Button>
        <Button flex={1} variant="outlined">
          Send
        </Button>
      </XStack>
      <Heading fontWeight="700" fontSize={16}>
        My Cards
      </Heading>
    </YStack>
  );
}
