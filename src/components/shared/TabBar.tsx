import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { TouchableWithoutFeedback } from "react-native";
import { moderateScale } from "react-native-size-matters";
import { View, Text, ButtonIcon, useTheme } from "tamagui";

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  return (
    <View
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      height={moderateScale(83)}
      padding={5}
      gap={10}
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
          <TouchableWithoutFeedback key={route.key} role="button" onPress={onPress}>
            <View display="flex" flexDirection="column" gap={2} alignContent="center" alignItems="center" flex={1}>
              <ButtonIcon>
                {icon?.({
                  focused: isFocused,
                  color: isFocused ? (theme.textBrandPrimary.val as string) : (theme.textSecondary.val as string),
                  size: 24,
                })}
              </ButtonIcon>
              <Text color={isFocused ? theme.textBrandPrimary : theme.textSecondary}>{label}</Text>
            </View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

export default TabBar;
