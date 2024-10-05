import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { NavigationRoute } from "@sentry/react-native/dist/js/tracing/reactnavigation";

import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { ButtonIcon, ToggleGroup } from "tamagui";

import SafeView from "./SafeView";
import Text from "./Text";

export default function TabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const onPress = useCallback(
    (route: NavigationRoute, focused: boolean) => {
      const event = navigation.emit({ canPreventDefault: true, target: route.key, type: "tabPress" });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    },
    [navigation],
  );
  return (
    <SafeView backgroundColor="$backgroundSoft" flexDirection="row" justifyContent="center" paddingTop={0} width="100%">
      <ToggleGroup
        borderRadius={0}
        borderTopColor="$borderNeutralSoft"
        borderTopWidth={1}
        flex={1}
        flexDirection="row"
        justifyContent="space-evenly"
        type="single"
        unstyled
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] ?? { options: undefined };
          if (!options) throw new Error("no navigation button options found");
          const label = options.title;
          const icon = options.tabBarIcon;
          const focused = state.index === index;
          return (
            <ToggleGroup.Item
              backgroundColor="transparent"
              borderWidth={0}
              key={route.key}
              onPress={() => {
                onPress(route, focused);
              }}
              paddingTop="$s3"
              role="button"
              value="center"
            >
              <ButtonIcon>
                {icon?.({ color: focused ? "$uiBrandSecondary" : "$uiNeutralSecondary", focused, size: ms(24) })}
              </ButtonIcon>
              <Text color={focused ? "$uiBrandSecondary" : "$uiNeutralSecondary"} textAlign="center">
                {label}
              </Text>
            </ToggleGroup.Item>
          );
        })}
      </ToggleGroup>
    </SafeView>
  );
}
