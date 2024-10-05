import release from "@exactly/common/generated/release";
import { ArrowLeft, ChevronRight, FlaskConical, HelpCircle, SunMoon } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import { router, useRouter } from "expo-router";
import React from "react";
import { Alert, type ColorSchemeName, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Separator, XStack } from "tamagui";

import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Settings() {
  const { canGoBack } = useRouter();
  const { data: theme } = useQuery<ColorSchemeName>({ queryKey: ["settings", "theme"] });
  const { present } = useIntercom();

  function handleSupport() {
    present().catch(handleError);
  }

  return (
    <SafeView fullScreen tab>
      <View fullScreen gap="$s5" padded>
        <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-around">
          <View left={0} position="absolute">
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
              </Pressable>
            )}
          </View>
          <Text color="$uiNeutralPrimary" emphasized subHeadline>
            Settings
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap="$s4_5">
            <View borderColor="$borderNeutralSoft" borderRadius="$r3" borderWidth={1}>
              <Pressable
                onPress={() => {
                  router.push("/settings/theme");
                }}
              >
                <XStack alignItems="center" justifyContent="space-between" padding="$s4">
                  <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
                    <SunMoon color="$backgroundBrand" />
                    <Text color="$uiNeutralPrimary" subHeadline>
                      Theme
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
                    <Text caption color="$uiBrandSecondary">
                      {theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System"}
                    </Text>
                    <ChevronRight color="$iconSecondary" />
                  </XStack>
                </XStack>
              </Pressable>
              <Separator borderColor="$borderNeutralSoft" />
              <Pressable
                onPress={() => {
                  router.push("/settings/beta");
                }}
              >
                <XStack alignItems="center" justifyContent="space-between" padding="$s4">
                  <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
                    <FlaskConical color="$backgroundBrand" />
                    <Text color="$uiNeutralPrimary" subHeadline>
                      Beta
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
                    <ChevronRight color="$iconSecondary" />
                  </XStack>
                </XStack>
              </Pressable>
              <Separator borderColor="$borderNeutralSoft" />
              <Pressable onPress={handleSupport}>
                <XStack alignItems="center" justifyContent="space-between" padding="$s4">
                  <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
                    <HelpCircle color="$backgroundBrand" />
                    <Text color="$uiNeutralPrimary" subHeadline>
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
              <Text color="$uiNeutralSecondary" footnote textAlign="center">
                {release}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
