import { QrCode } from "@phosphor-icons/react";
import React from "react";
import { Input, Stack, Text } from "tamagui";

import Button from "../components/Button";

export default function Send() {
  return (
    <Stack paddingTop="36px" paddingHorizontal="16px">
      <Text fontSize="16px" fontWeight="600" textAlign="center" marginBottom="32px">
        Send to
      </Text>
      <Stack flexDirection="row">
        <Input
          placeholder="ENS, Name, Address, CBU/CVU"
          flex={1}
          borderRightWidth={0}
          borderRadius={0}
          borderTopLeftRadius="8px"
          borderBottomLeftRadius="8px"
          height="48px"
        />
        <Button
          secondary
          padding="8px"
          actionIcon={<QrCode size="32px" />}
          borderLeftWidth={0}
          borderRadius={0}
          borderTopRightRadius="8px"
          borderBottomRightRadius="8px"
          height="48px"
          borderColor="$borderSoft"
        />
      </Stack>
    </Stack>
  );
}
