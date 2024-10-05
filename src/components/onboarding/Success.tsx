import { ArrowRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

import AccountCreatedImage from "../../assets/images/account-created.svg";
import AccountCreatedBlob from "../../assets/images/account-created-blob.svg";
import ActionButton from "../shared/ActionButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Success() {
  return (
    <SafeView backgroundColor="$backgroundSoft" fullScreen>
      <View fullScreen padded>
        <View alignItems="center" flexGrow={1} flexShrink={1} justifyContent="center">
          <View alignItems="center" aspectRatio={1} flexShrink={1} justifyContent="center" width="100%">
            <View aspectRatio={1} height="100%" width="100%">
              <AccountCreatedBlob height="100%" width="100%" />
            </View>
            <View aspectRatio={1} height="100%" style={StyleSheet.absoluteFill} width="100%">
              <AccountCreatedImage height="100%" width="100%" />
            </View>
          </View>
          <View gap="$s5" justifyContent="center">
            <Text brand centered emphasized title>
              Account created successfully!
            </Text>
          </View>
        </View>
        <View>
          <View alignSelf="stretch" flexDirection="row">
            <ActionButton
              iconAfter={<ArrowRight color="$interactiveOnBaseBrandDefault" />}
              marginBottom="$s5"
              marginTop="$s4"
              onPress={() => {
                // TODO Implement account setup
                router.replace("/(app)");
              }}
            >
              Start account setup
            </ActionButton>
          </View>
        </View>
      </View>
    </SafeView>
  );
}
