import type { Passkey } from "@exactly/common/validation";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Spinner } from "tamagui";

import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Text from "../shared/Text";

export default function PasskeyUtils() {
  const {
    data: passkey,
    isLoading,
    error,
  } = useQuery<Passkey>({ queryKey: ["passkey"], enabled: false, staleTime: 1 });

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
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {passkey.credentialId}
          </Text>
        </View>
      )}
      <View flexDirection="row" gap={ms(10)}>
        {passkey?.credentialId && (
          <Button outlined onPress={copy} padding={ms(10)} flex={1}>
            Copy
          </Button>
        )}
      </View>
    </View>
  );
}
