import { X } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, View } from "tamagui";

import Button from "../shared/Button";
import Text from "../shared/Text";

function close() {
  router.back();
}

export default function PasskeysAbout() {
  return (
    <View
      flex={1}
      flexDirection="column"
      alignItems="center"
      position="relative"
      backgroundColor="$backgroundSoft"
      justifyContent="space-between"
    >
      <View
        position="relative"
        height={ms(4)}
        width={ms(40)}
        borderRadius="$r_0"
        marginTop="$s3"
        backgroundColor="$backgroundMild"
      />
      <View flex={1} paddingVertical="$s8" paddingHorizontal="$s6" alignItems="center">
        <View flex={1} flexDirection="column" justifyContent="space-between" gap="$s5">
          <ScrollView flex={1}>
            <View flex={1} gap="$s8">
              <View gap="$s5">
                <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
                  How passkeys work
                </Text>
                <Text fontSize={16} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  Passkeys replace passwords with cryptographic keys. Your private key stays on your devide, while the
                  public key is shared with the service. This ensures secure and seamless authentication.
                </Text>
              </View>
              <View gap="$s5">
                <Text fontSize={ms(17)} fontWeight={700} textAlign="left">
                  Passkeys advantages
                </Text>
                <Text fontSize={16} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  <Text color="$uiNeutralSecondary" fontWeight="bold">
                    Strong credentials.
                  </Text>{" "}
                  Every passkey is strong. They&apos;re never guessable, reused, or weak.
                </Text>
                <Text fontSize={16} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  <Text color="$uiNeutralSecondary" fontWeight="bold">
                    Safe from server leaks.
                  </Text>{" "}
                  Because servers only keep public keys, servers are less valuable targets for hackers.
                </Text>
                <Text fontSize={16} fontWeight={400} color="$uiNeutralSecondary" textAlign="left">
                  <Text color="$uiNeutralSecondary" fontWeight="bold">
                    Safe from phishing.
                  </Text>{" "}
                  Passkeys are intrinsically linked with the app or website they were created for, so people can never
                  be tricked into using their passkey to sign in to a fraudulent app or website.
                </Text>
              </View>
            </View>
          </ScrollView>

          <Button
            outlined
            main
            spaced
            onPress={close}
            fontWeight="bold"
            iconAfter={<X color="$interactiveOnBaseBrandSoft" />}
          >
            Close
          </Button>
        </View>
      </View>
    </View>
  );
}
