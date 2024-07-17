import { CaretDown, CaretUp } from "phosphor-react-native";
import React, { useState } from "react";
import { TouchableWithoutFeedback } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, styled, ButtonIcon, useTheme } from "tamagui";

import AssetChange from "./AssetChange";
import AssetList from "./AssetList";

const BalanceView = styled(View, {
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
});

const Balance = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const onPress = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View display="flex" gap={20} paddingVertical={ms(20)}>
      <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text fontSize={15} lineHeight={21} fontWeight={600} color="$uiSecondary" textAlign="center" width="100%">
          Balance
        </Text>
      </View>
      <View display="flex" gap={10}>
        <TouchableWithoutFeedback onPress={onPress}>
          <BalanceView>
            <Text fontFamily="$mono" fontSize={40} fontWeight={700}>
              $15,186.95
            </Text>
            <ButtonIcon>
              {isOpen ? (
                <CaretUp size={32} color={theme.uiBrandSecondary.val as string} />
              ) : (
                <CaretDown size={32} color={theme.uiBrandSecondary.val as string} />
              )}
            </ButtonIcon>
          </BalanceView>
        </TouchableWithoutFeedback>
        <AssetChange />
      </View>
      {isOpen && <AssetList />}
    </View>
  );
};

export default Balance;
