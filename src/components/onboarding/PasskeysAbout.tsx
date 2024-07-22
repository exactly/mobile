import { router } from "expo-router";
import { X } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

const close = () => {
  router.back();
};

export default function PasskeysAbout() {
  const theme = useTheme();
  return (
    <View flex={1} flexDirection="column" alignItems="center">
      <View
        flex={1}
        backgroundColor="$backgroundSoft"
        padding={ms(20)}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
      >
        <View display="flex">
          <View display="flex" flexDirection="row" justifyContent="flex-end" position="relative">
            <View
              position="absolute"
              height={ms(4)}
              width={ms(40)}
              borderRadius={100}
              backgroundColor="$backgroundMild"
              left="50%"
              transform={[{ translateX: -ms(20) }]}
            />
            <Pressable onPress={close}>
              <View borderRadius={100} backgroundColor="$backgroundMild" padding={ms(2)}>
                <X size={ms(25)} color={theme.uiDarkGrey.val as string} />
              </View>
            </Pressable>
          </View>

          <View flexDirection="column" gap={ms(40)}>
            <View gap={ms(10)}>
              <Text fontSize={ms(17)} fontWeight={700} color="$uiPrimary" textAlign="left">
                How passkeys work
              </Text>
              <Text fontSize={16} fontWeight={400} color="$uiSecondary" textAlign="left">
                Passkeys replace passwords with cryptographic keys. Your private key stays on your devide, while the
                public key is shared with the service. This ensures secure and seamless authentication.
              </Text>
              <Text fontSize={ms(17)} fontWeight={700} color="$uiPrimary" textAlign="left">
                Passkeys advantages
              </Text>
              <Text fontSize={16} fontWeight={400} color="$uiSecondary" textAlign="left">
                <Text color="$uiSecondary" fontWeight={600}>
                  Strong credentials.
                </Text>{" "}
                Every passkey is strong. They&apos;re never guessable, reused, or weak.
              </Text>
              <Text fontSize={16} fontWeight={400} color="$uiSecondary" textAlign="left">
                <Text color="$uiSecondary" fontWeight={600}>
                  Safe from server leaks.
                </Text>{" "}
                Because servers only keep public keys, servers are less valuable targets for hackers.
              </Text>
              <Text fontSize={16} fontWeight={400} color="$uiSecondary" textAlign="left">
                <Text color="$uiSecondary" fontWeight={600}>
                  Safe from phishing.
                </Text>{" "}
                Passkeys are intrinsically linked with the app or website they were created for, so people can never be
                tricked into using their passkey to sign in to a fraudulent app or website.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
