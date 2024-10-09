import release from "@exactly/common/generated/release";
import { ArrowLeft, ChevronRight, FlaskConical, HelpCircle } from "@tamagui/lucide-icons";
import { setStringAsync } from "expo-clipboard";
import { router, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Separator, XStack } from "tamagui";

import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Settings() {
  const { canGoBack } = useRouter();
  const { present } = useIntercom();

  function handleSupport() {
    present().catch(handleError);
  }

  return (
    <SafeView fullScreen tab>
      <View fullScreen padded gap="$s5">
        <View flexDirection="row" gap="$s3" justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text emphasized subHeadline color="$uiNeutralPrimary">
            Settings
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap="$s4_5">
            <View borderRadius="$r3" borderWidth={1} borderColor="$borderNeutralSoft">
              <Pressable
                onPress={() => {
                  router.push("/settings/beta");
                }}
              >
                <XStack justifyContent="space-between" alignItems="center" padding="$s4">
                  <XStack gap="$s3" justifyContent="flex-start" alignItems="center">
                    <FlaskConical color="$backgroundBrand" />
                    <Text subHeadline color="$uiNeutralPrimary">
                      Beta
                    </Text>
                  </XStack>
                  <XStack gap="$s3" justifyContent="flex-start" alignItems="center">
                    <ChevronRight color="$iconSecondary" />
                  </XStack>
                </XStack>
              </Pressable>
              <Separator borderColor="$borderNeutralSoft" />
              <Pressable onPress={handleSupport}>
                <XStack justifyContent="space-between" alignItems="center" padding="$s4">
                  <XStack gap="$s3" justifyContent="flex-start" alignItems="center">
                    <HelpCircle color="$backgroundBrand" />
                    <Text subHeadline color="$uiNeutralPrimary">
                      Support
                    </Text>
                  </XStack>
                </XStack>
              </Pressable>
            </View>

            <Pressable
              hitSlop={ms(20)}
              onPress={() => {
                setStringAsync(release).catch(handleError);
                Alert.alert("Copied", "App version has been copied to the clipboard.");
              }}
            >
              <Text footnote color="$uiNeutralSecondary" textAlign="center">
                {release}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
