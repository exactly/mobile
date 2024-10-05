import { CircleDollarSign, CreditCard, FileText, Home } from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useAccount } from "wagmi";

import TabBar from "../../../components/shared/TabBar";
import useIntercom from "../../../utils/useIntercom";

const tabs = [
  { Icon: Home, name: "index", title: "Home" },
  { Icon: CreditCard, name: "card", title: "Card" },
  { Icon: CircleDollarSign, name: "payments", title: "Pay" },
  { Icon: FileText, name: "activity", title: "Activity" },
];

export default function HomeLayout() {
  const { address } = useAccount();
  useIntercom(address);
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(properties) => <TabBar {...properties} />}>
      {tabs.map(({ Icon, name, title }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: ({ color }) => <Icon color={color} size={24} />,
            title,
          }}
        />
      ))}
    </Tabs>
  );
}
