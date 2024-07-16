import { router } from "expo-router";
import { Key, X } from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import { TouchableOpacity } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";
import { useConnect } from "wagmi";

import PasskeysAbout from "./PasskeysAbout";
import Blob from "../../assets/images/onboarding-blob-05.svg";
import PasskeysImage from "../../assets/images/passkeys.svg";
import BaseLayout from "../shared/BaseLayout";
import DelayedActionButton from "../shared/DelayedActionButton";
import SafeView from "../shared/SafeView";
import SlideUpModal from "../shared/SlideUpModal";

const close = () => {
  router.back();
};

const Passkeys = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    connect,
    connectors: [connector],
  } = useConnect();
  const theme = useTheme();

  const connectAccount = useCallback(() => {
    if (!connector) throw new Error("no connector");
    connect({ connector });
  }, [connect, connector]);

  const learnMore = () => {
    setIsModalOpen(true);
  };

  return (
    <SafeView>
      <BaseLayout>
        <View flex={1}>
          <View position="absolute" top={moderateScale(20)} right={moderateScale(20)} zIndex={1}>
            <TouchableOpacity onPress={close}>
              <X size={moderateScale(25)} color={theme.uiDarkGrey.val as string} />
            </TouchableOpacity>
          </View>
          <View display="flex" alignItems="center" alignContent="center" justifyContent="center" height="100%" flex={1}>
            <View
              display="flex"
              alignItems="center"
              alignContent="center"
              justifyContent="center"
              height="100%"
              position="absolute"
              marginHorizontal={moderateScale(20)}
            >
              <Blob />
            </View>
            <View
              display="flex"
              alignItems="center"
              alignContent="center"
              justifyContent="center"
              height="100%"
              flex={1}
            >
              <PasskeysImage />
            </View>
          </View>

          <View
            flexDirection="column"
            paddingVertical={moderateScale(10)}
            paddingHorizontal={moderateScale(20)}
            gap={moderateScale(40)}
          >
            <View gap={moderateScale(10)}>
              <Text
                fontSize={moderateScale(20)}
                fontWeight={700}
                color="$interactiveBaseBrandDefault"
                textAlign="center"
              >
                A secure and easy way to access your account
              </Text>
              <Text fontSize={13} fontWeight={400} color="$uiBaseSecondary" textAlign="center">
                To keep your account secure, Exa App uses passkeys, a passwordless authentication method protected by
                your device biometric verification.
              </Text>
            </View>

            <View flexDirection="column" gap={moderateScale(10)}>
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
                  <Text fontSize={moderateScale(13)} fontWeight={600} color="$interactiveBaseBrandDefault">
                    Learn more about passkeys
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <SlideUpModal isOpen={isModalOpen}>
          <PasskeysAbout
            onClose={() => {
              setIsModalOpen(false);
            }}
          />
        </SlideUpModal>
      </BaseLayout>
    </SafeView>
  );
};

export default Passkeys;
