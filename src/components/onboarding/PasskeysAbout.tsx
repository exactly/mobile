import { X } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function close() {
  router.back();
}

export default function PasskeysAbout() {
  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen paddingTop={0}>
      <View
        alignItems="center"
        backgroundColor="$backgroundSoft"
        flexDirection="column"
        fullScreen
        justifyContent="space-between"
        position="relative"
      >
        <View
          backgroundColor="$backgroundMild"
          borderRadius="$r_0"
          height={ms(4)}
          marginTop="$s3"
          position="relative"
          width={ms(40)}
        />
        <View alignItems="center" flex={1} paddingHorizontal="$s6" paddingVertical="$s8">
          <View flex={1} flexDirection="column" gap="$s5" justifyContent="space-between">
            <ScrollView flex={1}>
              <View flex={1} gap="$s8">
                <View gap="$s5">
                  <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
                    How passkeys work
                  </Text>
                  <Text color="$uiNeutralSecondary" fontSize={16} fontWeight={400} textAlign="left">
                    Passkeys replace passwords with cryptographic keys. Your private key stays on your devide, while the
                    public key is shared with the service. This ensures secure and seamless authentication.
                  </Text>
                </View>
                <View gap="$s5">
                  <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
                    Passkeys advantages
                  </Text>
                  <Text color="$uiNeutralSecondary" fontSize={16} fontWeight={400} textAlign="left">
                    <Text color="$uiNeutralSecondary" fontWeight="bold">
                      {`Strong credentials.   `}
                    </Text>
                    Every passkey is strong. They&apos;re never guessable, reused, or weak.
                  </Text>
                  <Text color="$uiNeutralSecondary" fontSize={16} fontWeight={400} textAlign="left">
                    <Text color="$uiNeutralSecondary" fontWeight="bold">
                      {`Safe from server leaks.   `}
                    </Text>
                    Because servers only keep public keys, servers are less valuable targets for hackers.
                  </Text>
                  <Text color="$uiNeutralSecondary" fontSize={16} fontWeight={400} textAlign="left">
                    <Text color="$uiNeutralSecondary" fontWeight="bold">
                      {`Safe from phishing.   `}
                    </Text>
                    Passkeys are intrinsically linked with the app or website they were created for, so people can never
                    be tricked into using their passkey to sign in to a fraudulent app or website.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Button
              fontWeight="bold"
              iconAfter={<X color="$interactiveOnBaseBrandSoft" />}
              main
              onPress={close}
              outlined
              spaced
            >
              Close
            </Button>
          </View>
        </View>
      </View>
    </SafeView>
  );
}
