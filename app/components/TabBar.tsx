import { CoinVertical, CreditCard, House, Receipt } from "@phosphor-icons/react";
import React from "react";
import { Text, View } from "tamagui";

const TABS = [
  {
    id: "home",
    label: "Home",
    Icon: House,
  },
  {
    id: "card",
    label: "Card",
    Icon: CreditCard,
  },
  {
    id: "repay",
    label: "Repay",
    Icon: CoinVertical,
  },
  {
    id: "activity",
    label: "Activity",
    Icon: Receipt,
  },
];

export default function TabBar() {
  const current = "home";

  return (
    <View
      backgroundColor="$backgroundSoft"
      position="absolute"
      bottom={0}
      width="100%"
      display="flex"
      flexDirection="row"
      borderTopWidth="1px"
      borderColor="$borderSoft"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = id === current;
        return (
          <View
            flex={1}
            key={id}
            display="flex"
            flexDirection="column"
            alignItems="center"
            paddingVertical="8px"
            paddingHorizontal="24px"
          >
            <Icon weight={active ? "fill" : "regular"} size="24px" color={active ? "#12A594" : "#5F6563"} />
            <Text color={active ? "$textBrandPrimary" : "$textSecondary"} fontSize="11px" fontWeight="600">
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
