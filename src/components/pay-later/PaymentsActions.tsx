import { CircleDollarSign, Coins } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { styled, Switch } from "tamagui";

import Text from "../shared/Text";
import View from "../shared/View";

const StyledAction = styled(View, {
  flex: 1,
  minHeight: ms(140),
  borderWidth: 1,
  padding: ms(16),
  borderRadius: 10,
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  justifyContent: "space-between",
  flexBasis: "50%",
});

export default function PaymentsActions() {
  return (
    <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
      <StyledAction>
        <Pressable>
          <View gap={ms(10)}>
            <Coins size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
            <Text fontSize={ms(15)}>Auto-pay</Text>
            <Switch disabled backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft">
              <Switch.Thumb animation="quicker" backgroundColor="$backgroundSoft" shadowColor="$uiNeutralPrimary" />
            </Switch>
          </View>
        </Pressable>
      </StyledAction>
      <StyledAction>
        <Pressable>
          <View gap={ms(10)}>
            <CircleDollarSign size={ms(24)} color="$interactiveDisabled" fontWeight="bold" />
            <Text fontSize={ms(15)} color="$interactiveDisabled">
              Collateral
            </Text>
            <Text color="$interactiveDisabled" fontSize={ms(15)} fontWeight="bold">
              Manage
            </Text>
          </View>
        </Pressable>
      </StyledAction>
    </View>
  );
}
