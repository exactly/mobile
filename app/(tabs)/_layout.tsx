import { CoinVertical, CreditCard, House, Receipt } from "@phosphor-icons/react";
import { Tabs } from "expo-router";
import React from "react";

const TABS = [
  {
    id: "home/index",
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

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: "#12A594",
        tabBarInactiveTintColor: "#5F6563",
        header: () => <></>,
      }}
    >
      {TABS.map(({ id, label, Icon }) => (
        <Tabs.Screen
          key={id}
          name={id}
          options={{
            title: label,
            tabBarIcon: ({ color, focused }) => (
              <Icon weight={focused ? "fill" : "regular"} size="24px" color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
