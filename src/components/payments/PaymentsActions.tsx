import { CircleDollarSign, Coins } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { styled, Switch } from "tamagui";

import Text from "../shared/Text";
import View from "../shared/View";

const StyledAction = styled(View, {
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  borderRadius: 10,
  borderWidth: 1,
  flex: 1,
  flexBasis: "50%",
  justifyContent: "space-between",
  minHeight: ms(140),
  padding: ms(16),
});

export default function PaymentsActions() {
  return (
    <View flexDirection="row" gap={ms(10)} justifyContent="space-between">
      <StyledAction>
        <Pressable>
          <View gap={ms(10)}>
            <Coins color="$backgroundBrand" fontWeight="bold" size={ms(24)} />
            <Text fontSize={ms(15)}>Auto-pay</Text>
            <Switch backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft" disabled>
              <Switch.Thumb animation="quicker" backgroundColor="$backgroundSoft" shadowColor="$uiNeutralPrimary" />
            </Switch>
          </View>
        </Pressable>
      </StyledAction>
      <StyledAction>
        <Pressable>
          <View gap={ms(10)}>
            <CircleDollarSign color="$interactiveDisabled" fontWeight="bold" size={ms(24)} />
            <Text color="$interactiveDisabled" fontSize={ms(15)}>
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
