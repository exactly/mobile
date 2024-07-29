import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { ms } from "react-native-size-matters";
import { useTheme, ToggleGroup, ButtonIcon, Text } from "tamagui";

import SafeView from "./SafeView";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  return (
    <SafeView flex={0} paddingTop={0}>
      <ToggleGroup
        type="single"
        borderRadius={0}
        borderTopColor="$borderNeutralSoft"
        borderTopWidth={1}
        backgroundColor="$backgroundSoft"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || { options: undefined };
          if (!options) throw new Error("no navigation button options found");

          const label = options.title;
          const icon = options.tabBarIcon;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <ToggleGroup.Item
              key={route.key}
              backgroundColor="transparent"
              borderWidth={0}
              flex={1}
              onPress={onPress}
              padding={ms(10)}
              role="button"
              value="center"
            >
              <ButtonIcon>
                {icon?.({
                  focused: isFocused,
                  color: isFocused ? theme.uiBrandPrimary.val : theme.uiNeutralSecondary.val,
                  size: 24,
                })}
              </ButtonIcon>
              <Text textAlign="center" color={isFocused ? theme.uiBrandPrimary : theme.uiNeutralSecondary}>
                {label}
              </Text>
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup>
    </SafeView>
  );
}
