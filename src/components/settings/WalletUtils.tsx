import React from "react";
import { View } from "tamagui";
import { useAccount, useConnect } from "wagmi";

import alchemyConnector from "../../utils/alchemyConnector";
import Button from "../shared/Button";
import Text from "../shared/Text";

export default function WalletUtils() {
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  if (isConnected) return;
  return (
    <View gap={10}>
      <Text fontSize={16} fontWeight="bold">
        Connector
      </Text>

      <View flexDirection="row" gap={10}>
        <Button
          contained
          onPress={() => {
            connect({ connector: alchemyConnector });
          }}
          padding={10}
          flex={1}
        >
          Connect
        </Button>
      </View>
    </View>
  );
}
