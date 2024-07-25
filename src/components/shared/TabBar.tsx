import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { View, Text, ButtonIcon, useTheme } from "tamagui";

import SafeView from "./SafeView";
import StyledPressable from "./StyledPressable";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  return (
    <SafeView flex={0} paddingTop={0}>
      <View
        display="flex"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-around"
        height={vs(63)}
        backgroundColor="$backgroundSoft"
        borderColor="$borderNeutralSoft"
        borderTopWidth={0.5}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || { options: undefined };
          if (!options) throw new Error("No navigation button options found");

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
            <StyledPressable key={route.key} role="button" onPress={onPress} flex={1} padding={ms(10)}>
              <View
                flex={1}
                gap={ms(2)}
                display="flex"
                flexDirection="column"
                alignContent="center"
                alignItems="center"
              >
                <ButtonIcon>
                  {icon?.({
                    focused: isFocused,
                    color: isFocused ? theme.uiBrandPrimary.val : theme.uiNeutralSecondary.val,
                    size: vs(24),
                  })}
                </ButtonIcon>
                <Text textAlign="center" color={isFocused ? theme.uiBrandPrimary : theme.uiNeutralSecondary}>
                  {label}
                </Text>
              </View>
            </StyledPressable>
          );
        })}
      </View>
    </SafeView>
  );
}
