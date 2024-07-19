import { Tabs } from "expo-router";
import { CoinVertical, CreditCard, House, Receipt } from "phosphor-react-native";
import React from "react";

import TabBar from "../../components/shared/TabBar.js";

const tabs = [
  { name: "home", title: "Home", Icon: House },
  { name: "card", title: "Card", Icon: CreditCard },
  { name: "payments", title: "Payments", Icon: CoinVertical },
  { name: "activity", title: "Activity", Icon: Receipt },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(properties) => <TabBar {...properties} />}
    >
      {tabs.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => <Icon weight={focused ? "fill" : "regular"} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
