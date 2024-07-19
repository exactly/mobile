import { CaretDown, CaretUp } from "phosphor-react-native";
import React, { useState } from "react";
import { TouchableWithoutFeedback } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, ButtonIcon, useTheme } from "tamagui";

import AssetChange from "./AssetChange.js";
import AssetList from "./AssetList.js";

export default function Balance() {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const onPress = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View display="flex" gap={ms(20)}>
      <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} lineHeight={21} fontWeight="bold" color="$uiSecondary" textAlign="center" width="100%">
          Balance
        </Text>
      </View>
      <View display="flex" gap={ms(10)}>
        <TouchableWithoutFeedback onPress={onPress}>
          <View flexDirection="row" justifyContent="center" alignItems="center" gap={ms(10)}>
            <Text fontFamily="$mono" fontSize={ms(40)} fontWeight="bold">
              $15,186.95
            </Text>
            <ButtonIcon>
              {isOpen ? (
                <CaretUp size={ms(32)} color={theme.uiBrandSecondary.val as string} weight="bold" />
              ) : (
                <CaretDown size={ms(32)} color={theme.uiBrandSecondary.val as string} weight="bold" />
              )}
            </ButtonIcon>
          </View>
        </TouchableWithoutFeedback>
        <AssetChange />
      </View>
      {isOpen && <AssetList />}
    </View>
  );
}
