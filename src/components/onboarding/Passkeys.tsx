import { router } from "expo-router";
import { Key, X } from "phosphor-react-native";
import React, { useCallback, useEffect } from "react";
import { TouchableOpacity } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";
import { useConnect } from "wagmi";

import Blob from "../../assets/images/onboarding-blob-05.svg";
import PasskeysImage from "../../assets/images/passkeys.svg";
import BaseLayout from "../shared/BaseLayout";
import DelayedActionButton from "../shared/DelayedActionButton";
import SafeView from "../shared/SafeView";
import Spinner from "../shared/Spinner";

const close = () => {
  router.back();
};

const learnMore = () => {
  router.push("onboarding/(passkeys)/passkeys-about");
};

const Passkeys = () => {
  const {
    connect,
    connectors: [connector],
    isSuccess,
    isPending,
  } = useConnect();
  const theme = useTheme();

  const connectAccount = useCallback(() => {
    if (!connector) throw new Error("no connector");
    connect({ connector });
  }, [connect, connector]);

  useEffect(() => {
    if (isSuccess) {
      router.push("onboarding/success");
    }
  }, [connector, isSuccess]);

  if (isPending) {
    return (
      <SafeView>
        <BaseLayout flex={1}>
          <View flex={1} justifyContent="center" alignItems="center" gap={ms(40)}>
            <Spinner />
            <Text fontSize={ms(16)} fontWeight="bold" color="$interactiveBaseBrandDefault" textAlign="center">
              Creating your account. Please wait...
            </Text>
          </View>
        </BaseLayout>
      </SafeView>
    );
  }

  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View flex={1}>
          <View position="absolute" top={ms(20)} right={0} zIndex={1}>
            <TouchableOpacity onPress={close}>
              <X size={ms(25)} color={theme.uiDarkGrey.val as string} />
            </TouchableOpacity>
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
                <Text>By continuing, I accept the</Text>
                <TouchableOpacity onPress={() => {}}>
                  <Text color="$interactiveBaseBrandDefault">Terms & Conditions</Text>
                </TouchableOpacity>
              </View>
              <DelayedActionButton
                content="Set passkey and create account"
                onPress={() => {
                  connectAccount();
                }}
                Icon={Key}
              />
              <View justifyContent="center" alignItems="center">
                <TouchableOpacity onPress={learnMore}>
                  <Text fontSize={ms(13)} fontWeight={600} color="$interactiveBaseBrandDefault">
                    Learn more about passkeys
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Passkeys;
