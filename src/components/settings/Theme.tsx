import { ArrowLeft, CheckCircle2, Moon, Smartphone, Sun } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useRouter } from "expo-router";
import React from "react";
import type { ColorSchemeName } from "react-native";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, ToggleGroup, XStack } from "tamagui";

import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";
import useTheme from "../../utils/useTheme";

const options: {
  name: string;
  value: ColorSchemeName;
  Icon: typeof Sun;
}[] = [
  {
    name: "Light",
    value: "light",
    Icon: Sun,
  },
  {
    name: "Dark",
    value: "dark",
    Icon: Moon,
  },
  {
    name: "System",
    value: undefined,
    Icon: Smartphone,
  },
];

export default function Theme() {
  const { canGoBack } = useRouter();
  const { setAppearance } = useTheme();
  const { data: theme } = useQuery<ColorSchemeName>({ queryKey: ["theme"] });
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
            Theme
          </Text>
        </View>
        <ScrollView flex={1}>
          <ToggleGroup unstyled type="single" flexDirection="column" justifyContent="flex-start">
            {options.map(({ name, value, Icon }, index) => {
              const active = theme === value;
              return (
                <ToggleGroup.Item
                  disabled={active}
                  unstyled
                  key={index}
                  role="button"
                  value="center"
                  backgroundColor="transparent"
                  borderWidth={0}
                  onPress={() => {
                    setAppearance(value);
                  }}
                >
                  <XStack
                    borderRadius="$r3"
                    justifyContent="space-between"
                    alignItems="center"
                    padding="$s4"
                    backgroundColor={active ? "$interactiveBaseBrandSoftDefault" : "transparent"}
                  >
                    <XStack gap="$s3">
                      <Icon size={ms(24)} color={active ? "$interactiveOnBaseBrandSoft" : "$uiNeutralPrimary"} />
                      <Text subHeadline color={active ? "$interactiveOnBaseBrandSoft" : "$uiNeutralPrimary"}>
                        {name}
                      </Text>
                    </XStack>
                    {active && <CheckCircle2 size={ms(24)} color="$interactiveOnBaseBrandSoft" />}
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
