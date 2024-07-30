import type { Passkey } from "@exactly/common/types";
import { Key, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";
import { useConnect } from "wagmi";

import Blob from "../../assets/images/onboarding-blob-05.svg";
import PasskeysImage from "../../assets/images/passkeys.svg";
import createPasskey from "../../utils/createPasskey";
import handleError from "../../utils/handleError";
import ActionButton from "../shared/ActionButton";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

function close() {
  router.back();
}

function learnMore() {
  router.push("../(passkeys)/about");
}

const Passkeys = () => {
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
    <SafeView>
      <BaseLayout flex={1}>
        <View flex={1} paddingTop={ms(40)}>
          <View position="absolute" top={ms(20)} right={0} zIndex={1}>
            <Pressable onPress={close}>
              <X size={ms(25)} color="$uiNeutralSecondary" />
            </Pressable>
          </View>

          <View alignItems="center" alignContent="center" justifyContent="center" height="100%" flex={1}>
            <View position="absolute">
              <Blob />
            </View>
            <View position="absolute">
              <PasskeysImage />
            </View>
          </View>

          <View flexDirection="column" paddingVertical={ms(10)} paddingHorizontal={ms(20)} gap={ms(40)}>
            <View gap={ms(10)}>
              <Text fontSize={ms(20)} fontWeight={700} color="$interactiveBaseBrandDefault" textAlign="center">
                A secure and easy way to access your account
              </Text>
              <Text fontSize={13} fontWeight={400} color="$uiBaseSecondary" textAlign="center">
                To keep your account secure, Exa App uses passkeys, a passwordless authentication method protected by
                your device biometric verification.
              </Text>
            </View>

            <View flexDirection="column" gap={ms(10)}>
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
      </BaseLayout>
    </SafeView>
  );
};

export default Passkeys;
