import type { Passkey } from "@exactly/common/validation";

import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import React from "react";
import { ms } from "react-native-size-matters";
import { Spinner, View } from "tamagui";

import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Text from "../shared/Text";

export default function PasskeyUtils() {
  const {
    data: passkey,
    error,
    isLoading,
  } = useQuery<Passkey>({ enabled: false, queryKey: ["passkey"], staleTime: 1 });

  function copy() {
    if (!passkey?.credentialId) return;
    setStringAsync(passkey.credentialId).catch(handleError);
  }
  return (
    <View gap={ms(10)}>
      <Text fontSize={ms(16)} fontWeight="bold">
        Passkey
      </Text>
      {isLoading && <Spinner backgroundColor="$interactiveBaseBrandDefault" />}
      {error && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {error.message}
        </Text>
      )}
      {passkey?.credentialId && (
        <View borderColor="$borderNeutralSoft" borderRadius="$r4" borderWidth={2} padding={ms(10)}>
          <Text fontFamily="$mono" fontSize={ms(14)} fontWeight="bold" textAlign="center" width="100%">
            {passkey.credentialId}
          </Text>
        </View>
      )}
      <View flexDirection="row" gap={ms(10)}>
        {passkey?.credentialId && (
          <Button flex={1} onPress={copy} outlined padding={ms(10)}>
            Copy
          </Button>
        )}
      </View>
    </View>
  );
}
