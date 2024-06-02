import React from "react";
import { Image, Stack, Text, View } from "tamagui";

import Contact from "../components/Contact";

function Balance() {
  return (
    <View display="flex" gap="12px" flexDirection="row" alignItems="center">
      <Image
        source="https://cdn.worldvectorlogo.com/logos/ethereum-eth.svg"
        alt="profile photo"
        width="32px"
        height="32px"
      />
      <View flex={1} display="flex" flexDirection="column" gap="4px">
        <Text fontSize="17px">ETH</Text>
        <Text fontSize="13px" color="$textSecondary">
          Ethereum
        </Text>
      </View>
      <View display="flex" flexDirection="column" gap="4px">
        <Text textAlign="right" fontSize="17px">
          $2,393
        </Text>
        <Text textAlign="right" fontSize="13px" color="$textSecondary">
          0.809 ETH
        </Text>
      </View>
    </View>
  );
}

export default function Send() {
  return (
    <Stack paddingTop="36px" paddingHorizontal="16px">
      <Text fontSize="16px" fontWeight="600" textAlign="center" marginBottom="32px">
        Choose asset
      </Text>
      <Contact />
      <View borderWidth="1px" borderColor="#DFE2E0" padding="24px" paddingRight="32px" borderRadius="8px" gap="24px">
        <Balance />
        <Balance />
        <Balance />
      </View>
    </Stack>
  );
}
