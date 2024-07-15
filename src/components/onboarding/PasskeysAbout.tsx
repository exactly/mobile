import { X } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { Text, View, useTheme } from "tamagui";

interface PasskeysAboutProperties {
  onClose: () => void;
}

const PasskeysAbout = ({ onClose }: PasskeysAboutProperties) => {
  const theme = useTheme();
  return (
    <View flex={1} flexDirection="column" justifyContent="flex-end" alignItems="center">
      <View backgroundColor="$backgroundSoft" padding={moderateScale(20)}>
        <View gap={moderateScale(5)} display="flex">
          <View display="flex" alignSelf="flex-end">
            <TouchableOpacity onPress={onClose}>
              <X size={moderateScale(25)} color={theme.uiDarkGrey.val as string} />
            </TouchableOpacity>
          </View>

          <View flexDirection="column" gap={moderateScale(40)}>
            <View gap={moderateScale(10)}>
              <Text fontSize={moderateScale(17)} fontWeight={700} color="$uiPrimary" textAlign="left">
                How passkeys work
              </Text>
              <Text fontSize={16} fontWeight={400} color="$uiSecondary" textAlign="left">
                Passkeys replace passwords with cryptographic keys. Your private key stays on your devide, while the
                public key is shared with the service. This ensures secure and seamless authentication.
              </Text>
              <Text fontSize={moderateScale(17)} fontWeight={700} color="$uiPrimary" textAlign="left">
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
};

export default PasskeysAbout;
