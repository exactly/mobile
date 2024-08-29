import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationRoute } from "@sentry/react-native/dist/js/tracing/reactnavigation";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { ToggleGroup, ButtonIcon, Text } from "tamagui";

import SafeView from "./SafeView";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const onPress = useCallback(
    (route: NavigationRoute, focused: boolean) => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    },
    [navigation],
  );
  return (
    <SafeView flexDirection="row" width="100%" paddingTop={0} backgroundColor="$backgroundSoft" justifyContent="center">
      <ToggleGroup
        borderRadius={0}
        borderTopColor="$borderNeutralSoft"
        borderTopWidth={1}
        type="single"
        unstyled
        justifyContent="space-evenly"
        flexDirection="row"
        flex={1}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] ?? { options: undefined };
          if (!options) throw new Error("no navigation button options found");
          const label = options.title;
          const icon = options.tabBarIcon;
          const focused = state.index === index;
          return (
            <ToggleGroup.Item
              key={route.key}
              backgroundColor="transparent"
              borderWidth={0}
              onPress={() => {
                onPress(route, focused);
              }}
              padding={ms(10)}
              role="button"
              value="center"
            >
              <ButtonIcon>
                {icon?.({
                  focused,
                  color: focused ? "$uiBrandPrimary" : "$uiNeutralSecondary",
                  size: 24,
                })}
              </ButtonIcon>
              <Text textAlign="center" color={focused ? "$uiBrandPrimary" : "$uiNeutralSecondary"}>
                {label}
              </Text>
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup>
    </SafeView>
  );
}
