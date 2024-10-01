import { CircleDollarSign, CreditCard, FileText, Home } from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useAccount } from "wagmi";

import TabBar from "../../../components/shared/TabBar";
import useIntercom from "../../../utils/useIntercom";

const tabs = [
  { name: "index", title: "Home", Icon: Home },
  { name: "card", title: "Card", Icon: CreditCard },
  { name: "payments", title: "Pay", Icon: CircleDollarSign },
  { name: "activity", title: "Activity", Icon: FileText },
];

export default function HomeLayout() {
  const { address } = useAccount();
  useIntercom(address);
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(properties) => <TabBar {...properties} />}>
      {tabs.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => <Icon size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
