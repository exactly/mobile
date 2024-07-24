import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import React from "react";
import { ms } from "react-native-size-matters";
import { Button, Spinner, Text, View } from "tamagui";

import handleError from "../../utils/handleError";
import loadPasskey from "../../utils/loadPasskey";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

const pressStyle = { backgroundColor: "$interactiveBaseBrandDefault", opacity: 0.9 };

export default function Payments() {
  const {
    data: passkey,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["passkey"], queryFn: loadPasskey, enabled: false, staleTime: 1 });

  function getPasskey() {
    refetch().catch(handleError);
  }

  const copy = () => {
    if (!passkey?.credentialId) return;
    Clipboard.setStringAsync(passkey.credentialId).catch(handleError);
  };

  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View gap={ms(20)}>
          <Text fontSize={40} fontFamily="$mono" fontWeight="bold">
            Payments
          </Text>
          <View gap={ms(10)}>
            <Text fontSize={ms(16)} color="$uiNeutralPrimary" fontWeight="bold">
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
              <Button
                borderRadius="$r2"
                variant="outlined"
                backgroundColor="$interactiveBaseBrandDefault"
                color="$interactiveOnBaseBrandDefault"
                onPress={getPasskey}
                fontWeight="bold"
                pressStyle={pressStyle}
                padding={ms(10)}
                flex={1}
              >
                Refresh
              </Button>

              {passkey?.credentialId && (
                <Button
                  borderRadius="$r2"
                  variant="outlined"
                  backgroundColor="$interactiveBaseBrandSoftDefault"
                  color="$interactiveOnBaseBrandSoft"
                  onPress={copy}
                  fontWeight="bold"
                  pressStyle={pressStyle}
                  padding={ms(10)}
                  flex={1}
                >
                  Copy
                </Button>
              )}
            </View>
          </View>
        </View>
      </BaseLayout>
    </SafeView>
  );
}
