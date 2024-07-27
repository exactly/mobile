import type { Passkey } from "@exactly/common/types";
import { Key, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

import Blob from "../../assets/images/onboarding-blob-05.svg";
import PasskeysImage from "../../assets/images/passkeys.svg";
import createPasskey from "../../utils/createPasskey";
import handleError from "../../utils/handleError";
import BaseLayout from "../shared/BaseLayout";
import MainActionButton from "../shared/MainActionButton";
import SafeView from "../shared/SafeView";

function close() {
  router.back();
}

function learnMore() {
  router.push("onboarding/(passkeys)/about");
}

const Passkeys = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const {
    mutate: create,
    isSuccess,
    isPending,
  } = useMutation<Passkey>({
    mutationFn: createPasskey,
    onError: handleError,
    onSuccess(passkey) {
      queryClient.setQueryData<Passkey>(["passkey"], passkey);
    },
  });

  const { data } = useQuery<Passkey>({ queryKey: ["passkey"] });

  useEffect(() => {
    if (isSuccess && data?.credentialId) {
      router.push("onboarding/success");
    }
  }, [data, isSuccess]);

  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View flex={1} paddingTop={ms(40)}>
          <View position="absolute" top={ms(20)} right={0} zIndex={1}>
            <Pressable onPress={close}>
              <X size={ms(25)} color={theme.uiNeutralSecondary.val} />
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
              <MainActionButton
                isLoading={isPending}
                loadingContent="Creating account..."
                content="Create account"
                onPress={create}
                Icon={Key}
              />
              <View justifyContent="center" alignItems="center">
                <Pressable onPress={learnMore}>
                  <Text fontSize={ms(13)} fontWeight={600} color="$interactiveBaseBrandDefault">
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
