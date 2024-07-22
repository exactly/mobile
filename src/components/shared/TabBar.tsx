import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { ms, vs } from "react-native-size-matters";
import { View, Text, ButtonIcon, useTheme } from "tamagui";

import SafeView from "./SafeView.js";
import StyledPressable from "./StyledPressable.js";

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
        gap={ms(10)}
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
              <View display="flex" flexDirection="column" gap={ms(2)} alignContent="center" alignItems="center">
                <ButtonIcon>
                  {icon?.({
                    focused: isFocused,
                    color: isFocused ? (theme.textBrandPrimary.val as string) : (theme.textSecondary.val as string),
                    size: vs(24),
                  })}
                </ButtonIcon>
                <Text color={isFocused ? theme.textBrandPrimary : theme.textSecondary}>{label}</Text>
              </View>
            </StyledPressable>
          );
        })}
      </View>
    </SafeView>
  );
}
