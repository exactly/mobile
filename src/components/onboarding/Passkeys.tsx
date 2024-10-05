import type { Passkey } from "@exactly/common/validation";

import { Key, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { useConnect } from "wagmi";

import PasskeysImage from "../../assets/images/passkeys.svg";
import PasskeysBlob from "../../assets/images/passkeys-blob.svg";
import alchemyConnector from "../../utils/alchemyConnector";
import createPasskey from "../../utils/createPasskey";
import handleError from "../../utils/handleError";
import ActionButton from "../shared/ActionButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function close() {
  router.back();
}

function learnMore() {
  router.push("../(passkeys)/about");
}

export default function Passkeys() {
  const queryClient = useQueryClient();

  const {
    isPending,
    isSuccess,
    mutate: createAccount,
  } = useMutation<Passkey>({
    mutationFn: createPasskey,
    onError: handleError,
    onSuccess(passkey) {
      queryClient.setQueryData<Passkey>(["passkey"], passkey);
    },
  });

  const { connect, isPending: isConnecting } = useConnect();

  const { data } = useQuery<Passkey>({ queryKey: ["passkey"] });

  useEffect(() => {
    if (isSuccess && data?.credentialId) {
      connect({ connector: alchemyConnector });
      router.replace("../success");
    }
  }, [connect, data, isSuccess]);

  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen>
      <View fullScreen padded>
        <View position="absolute" right="$s5" zIndex={1}>
          <Pressable onPress={close}>
            <X color="$uiNeutralSecondary" size={ms(25)} />
          </Pressable>
        </View>
        <View alignItems="center" flexGrow={1} flexShrink={1} justifyContent="center">
          <View alignItems="center" aspectRatio={1} flexShrink={1} justifyContent="center" width="100%">
            <View aspectRatio={1} height="100%" width="100%">
              <PasskeysBlob height="100%" width="100%" />
            </View>
            <View aspectRatio={1} height="100%" style={StyleSheet.absoluteFill} width="100%">
              <PasskeysImage height="100%" width="100%" />
            </View>
          </View>

          <View gap="$s5" justifyContent="center">
            <Text brand centered emphasized title>
              A secure and easy way to access your account
            </Text>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} textAlign="center">
              To keep your account secure, Exa App uses passkeys, a passwordless authentication method protected by your
              device biometric verification.
            </Text>
          </View>
        </View>

        <View alignItems="stretch" alignSelf="stretch">
          <View alignSelf="stretch" flexDirection="row" justifyContent="center">
            <Text color="$uiNeutralPlaceholder" fontSize={ms(11)}>
              {`By continuing, I accept the `}
            </Text>
            <Text color="$interactiveBaseBrandDefault" fontSize={ms(11)}>
              Terms & Conditions
            </Text>
          </View>

          <View>
            <View alignSelf="stretch" flexDirection="row">
              <ActionButton
                flex={1}
                iconAfter={<Key color="$interactiveOnBaseBrandDefault" fontWeight="bold" size={ms(20)} />}
                isLoading={isPending || isConnecting}
                loadingContent="Creating account..."
                marginBottom="$s5"
                marginTop="$s4"
                onPress={() => {
                  createAccount();
                }}
              >
                Create account
              </ActionButton>
            </View>

            <View flexDirection="row" justifyContent="center">
              <Pressable onPress={learnMore}>
                <Text color="$interactiveBaseBrandDefault" fontSize={ms(13)} fontWeight="bold" textAlign="center">
                  Learn more about passkeys
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeView>
  );
}
