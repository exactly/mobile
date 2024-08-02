import type { Passkey } from "@exactly/common/types";
import { Key, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
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
    <SafeView backgroundColor="$backgroundSoft">
      <View flex={1} padding="$s5">
        <View position="absolute" top="$s5" right="$s5" zIndex={1}>
          <Pressable onPress={close}>
            <X size={ms(25)} color="$uiNeutralSecondary" />
          </Pressable>
        </View>

        <View alignItems="center" alignContent="center" justifyContent="center" height="100%" flex={1}>
          <View position="absolute">
            <PasskeysBlob />
          </View>
          <View position="absolute">
            <PasskeysImage />
          </View>
        </View>

        <View flexDirection="column" gap={ms(40)}>
          <View gap={ms(10)}>
            <Text emphasized title brand centered>
              A secure and easy way to access your account
            </Text>
            <Text secondary fontSize={13} fontWeight={400} color="$uiBaseSecondary" textAlign="center">
              To keep your account secure, Exa App uses passkeys, a passwordless authentication method protected by your
              device biometric verification.
            </Text>
          </View>

          <View flexDirection="column" gap="$s5">
            <View gap="$s4">
              <View flexDirection="row" alignItems="center" justifyContent="center">
                <Text fontSize={ms(11)} color="$uiNeutralPlaceholder">
                  By continuing, I accept the
                </Text>
                <Text fontSize={ms(11)} color="$interactiveBaseBrandDefault">
                  {" "}
                  Terms & Conditions
                </Text>
              </View>
              <ActionButton
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
            <View justifyContent="center" alignItems="center">
              <Pressable onPress={learnMore}>
                <Text fontSize={ms(13)} fontWeight="bold" color="$interactiveBaseBrandDefault">
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
