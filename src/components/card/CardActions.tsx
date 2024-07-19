import { Eye, Snowflake } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme, Switch, styled } from "tamagui";

const StyledActionButton = styled(Pressable, {
  flex: 1,
  gap: ms(10),
  borderWidth: 1,
  padding: ms(16),
  borderRadius: 10,
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  justifyContent: "space-between",
});

export default function CardActions() {
  const theme = useTheme();
  return (
    <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
      <StyledActionButton>
        <Eye size={ms(24)} color={theme.backgroundBrand.get() as string} weight="bold" />
        <Text color="$uiPrimary" fontSize={ms(15)}>
          Details
        </Text>
        <Text color="$textBrand" fontSize={ms(15)} fontWeight="bold">
          Reveal
        </Text>
      </StyledActionButton>

      <StyledActionButton>
        <Snowflake size={ms(24)} color={theme.backgroundBrand.get() as string} weight="bold" />
        <Text color="$uiPrimary" fontSize={ms(15)}>
          Freeze
        </Text>
        <Switch size={ms(24)} backgroundColor="$backgroundMild" maxWidth="50%">
          <Switch.Thumb animation="quicker" backgroundColor="$backgroundSoft" shadowColor="$uiPrimary" />
        </Switch>
      </StyledActionButton>
    </View>
  );
}
