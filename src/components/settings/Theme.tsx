import { ArrowLeft, CheckCircle2, Moon, Smartphone, Sun } from "@tamagui/lucide-icons";
import { router, useRouter } from "expo-router";
import React, { useContext } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, ToggleGroup, XStack } from "tamagui";

import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";
import { type AppTheme, ThemeContext } from "../context/ThemeProvider";

const options: {
  Icon: typeof Sun;
  name: string;
  value: AppTheme;
}[] = [
  { Icon: Sun, name: "Light", value: "light" },
  { Icon: Moon, name: "Dark", value: "dark" },
  { Icon: Smartphone, name: "System", value: "system" },
];

export default function Theme() {
  const { canGoBack } = useRouter();
  const { setTheme, theme } = useContext(ThemeContext);
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
            Theme
          </Text>
        </View>
        <ScrollView flex={1}>
          <ToggleGroup flexDirection="column" justifyContent="flex-start" type="single" unstyled>
            {options.map(({ Icon, name, value }, index) => {
              const active = theme === value;
              return (
                <ToggleGroup.Item
                  backgroundColor="transparent"
                  borderWidth={0}
                  disabled={active}
                  key={index}
                  onPress={() => {
                    setTheme(value);
                  }}
                  role="button"
                  unstyled
                  value="center"
                >
                  <XStack
                    alignItems="center"
                    backgroundColor={active ? "$interactiveBaseBrandSoftDefault" : "transparent"}
                    borderRadius="$r3"
                    justifyContent="space-between"
                    padding="$s4"
                  >
                    <XStack gap="$s3">
                      <Icon color={active ? "$interactiveOnBaseBrandSoft" : "$uiNeutralPrimary"} size={ms(24)} />
                      <Text color={active ? "$interactiveOnBaseBrandSoft" : "$uiNeutralPrimary"} subHeadline>
                        {name}
                      </Text>
                    </XStack>
                    {active && <CheckCircle2 color="$interactiveOnBaseBrandSoft" size={ms(24)} />}
                  </XStack>
                </ToggleGroup.Item>
              );
            })}
          </ToggleGroup>
        </ScrollView>
      </View>
    </SafeView>
  );
}
