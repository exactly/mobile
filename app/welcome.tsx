import React, { useCallback, useState } from "react";
import { YStack, Button, Text, Spinner, Heading } from "tamagui";
import { useConnect } from "wagmi";

import createAccount from "../utils/createAccount";

export default function Welcome() {
  const [loading, setLoading] = useState(false);

  const {
    connect,
    connectors: [connector],
  } = useConnect();

  const connectAccount = useCallback(() => {
    if (!connector) throw new Error("no connector");
    connect({ connector });
  }, [connect, connector]);

  const handleGetStartedClick = useCallback(async () => {
    setLoading(true);
    await createAccount();
    setLoading(false);
  }, []);

  if (loading)
    return (
      <YStack height="100vh" display="flex" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );

  return (
    <YStack height="100%">
      <YStack padding={16}>
        <Heading fontSize={32} fontWeight="600" marginBottom={24}>
          Buy now, pay later and hold your crypto.
        </Heading>
        <Text marginBottom={40} fontSize={14} fontWeight="500">
          Use our self-custodial digital credit card and pay with USDC in up to 12 installments without having to swap
          your ETH or BTC.
        </Text>

        <Button width="100%" marginBottom={16} onPress={handleGetStartedClick}>
          Get started
        </Button>

        <Text fontSize={14} textAlign="center" onPress={connectAccount}>
          Already have an account? Recover passkey
        </Text>
      </YStack>
    </YStack>
  );
}
