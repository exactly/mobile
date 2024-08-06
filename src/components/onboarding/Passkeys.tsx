import type { Passkey } from "@exactly/common/types";
import { Key, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";
import { useConnect } from "wagmi";

import PasskeysBlob from "../../assets/images/passkeys-blob.svg";
import PasskeysImage from "../../assets/images/passkeys.svg";
import createPasskey from "../../utils/createPasskey";
import handleError from "../../utils/handleError";
import ActionButton from "../shared/ActionButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";

function close() {
  router.back();
}

function learnMore() {
  router.push("../(passkeys)/about");
}

export default function Passkeys() {
  const queryClient = useQueryClient();

  const {
    mutate: createAccount,
    isSuccess,
    isPending,
  } = useMutation<Passkey>({
    mutationFn: createPasskey,
    onError: handleError,
    onSuccess(passkey) {
      queryClient.setQueryData<Passkey>(["passkey"], passkey);
    },
  });

  const {
    connect,
    isPending: isConnecting,
    connectors: [connector],
  } = useConnect();

  const { data } = useQuery<Passkey>({ queryKey: ["passkey"] });

  useEffect(() => {
    if (isSuccess && data?.credentialId && connector) {
      connect({ connector });
      router.replace("../success");
    }
  }, [connect, connector, data, isSuccess]);

  return (
    <SafeView
      backgroundColor="$backgroundSoft"
      padding="$s5"
      justifyContent="space-between"
      alignItems="stretch"
      gap="$s5"
    >
      <View position="absolute" top="$s5" right="$s5" zIndex={1}>
        <Pressable onPress={close}>
          <X size={ms(25)} color="$uiNeutralSecondary" />
        </Pressable>
      </View>
      <View justifyContent="center" alignItems="center" flexGrow={1} flexShrink={1}>
        <View width="100%" aspectRatio={1} justifyContent="center" alignItems="center" flexShrink={1}>
          <View width="100%" height="100%" aspectRatio={1}>
            <PasskeysBlob width="100%" height="100%" />
          </View>
          <View width="100%" height="100%" aspectRatio={1} style={StyleSheet.absoluteFill}>
            <PasskeysImage width="100%" height="100%" />
          </View>
        </View>

        <View gap="$s5" justifyContent="center">
          <Text emphasized title brand centered>
            A secure and easy way to access your account
          </Text>
          <Text secondary fontSize={ms(13)} color="$uiBaseSecondary" textAlign="center">
            To keep your account secure, Exa App uses passkeys, a passwordless authentication method protected by your
            device biometric verification.
          </Text>
        </View>
      </View>

      <View alignItems="stretch" alignSelf="stretch">
        <View flexDirection="row" alignSelf="stretch" justifyContent="center">
          <Text fontSize={ms(11)} color="$uiNeutralPlaceholder">
            By continuing, I accept the
          </Text>
          <Text fontSize={ms(11)} color="$interactiveBaseBrandDefault">
            {" "}
            Terms & Conditions
          </Text>
        </View>

        <View flexDirection="row" alignSelf="stretch">
          <ActionButton
            flex={1}
            marginTop="$s4"
            marginBottom="$s5"
            isLoading={isPending || isConnecting}
            loadingContent="Creating account..."
            iconAfter={<Key size={ms(20)} color="$interactiveOnBaseBrandDefault" fontWeight="bold" />}
            onPress={() => {
              createAccount();
            }}
          >
            Create account
          </ActionButton>
        </View>

        <View flexDirection="row" justifyContent="center">
          <Pressable onPress={learnMore}>
            <Text textAlign="center" fontSize={ms(13)} fontWeight="bold" color="$interactiveBaseBrandDefault">
              Learn more about passkeys
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeView>
  );
}
