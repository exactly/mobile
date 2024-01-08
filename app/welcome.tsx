import { Link } from "expo-router";
import React from "react";
import { Heading, YStack, Button, Text } from "tamagui";

import WelcomePos from "../assets/welcome-pos.svg";
export default function Welcome() {
  return (
    <YStack height="100%">
      <YStack flexGrow={1}>
        <WelcomePos width="100%" height="100%" />
      </YStack>
      <YStack padding={16}>
        <Heading fontSize={32} fontWeight="600" marginBottom={24}>
          Buy now, pay later and hold your crypto.
        </Heading>
        <Text marginBottom={40} fontSize={14} fontWeight="500">
          Use our self-custodial digital credit card and pay with USDC in up to 12 installments without having to swap
          your ETH or BTC.
        </Text>
        <Link href="/home">
          <Button width="100%" marginBottom={16}>
            Get started
          </Button>
        </Link>

        <Text fontSize={14} textAlign="center">
          Already have an account? Recover passkey
        </Text>
      </YStack>
    </YStack>
  );
}
