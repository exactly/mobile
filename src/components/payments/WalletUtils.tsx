import React from "react";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";
import { useAccount, useConnect } from "wagmi";

import Button from "../shared/Button";
import Text from "../shared/Text";

export default function WalletUtils() {
  const {
    connect,
    connectors: [connector],
  } = useConnect();
  const { isConnected } = useAccount();
  if (isConnected) return;
  return (
    <View gap={ms(10)}>
      <Text fontSize={ms(16)} fontWeight="bold">
        Connector
      </Text>

      <View flexDirection="row" gap={ms(10)}>
        <Button
          contained
          onPress={() => {
            if (connector) connect({ connector });
          }}
          padding={ms(10)}
          flex={1}
        >
          Connect
        </Button>
      </View>
    </View>
  );
}
