import release from "@exactly/common/generated/release";
import Intercom from "@intercom/intercom-react-native";
import { ArrowLeft, ChevronRight, FlaskConical, HelpCircle, SunMoon } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import { router, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, type ColorSchemeName } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Separator, XStack } from "tamagui";

import handleError from "../../utils/handleError";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function handleSupport() {
  Intercom.present().catch(handleError);
}

export default function Settings() {
  const { canGoBack } = useRouter();
  const { data: theme } = useQuery<ColorSchemeName>({ queryKey: ["settings", "theme"] });

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
                  router.push("/settings/theme");
                }}
              >
                <XStack justifyContent="space-between" alignItems="center" padding="$s4">
                  <XStack gap="$s3" justifyContent="flex-start" alignItems="center">
                    <SunMoon color="$backgroundBrand" />
                    <Text subHeadline color="$uiNeutralPrimary">
                      Theme
                    </Text>
                  </XStack>
                  <XStack gap="$s3" justifyContent="flex-start" alignItems="center">
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
