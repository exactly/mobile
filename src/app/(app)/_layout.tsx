import type { Passkey } from "@exactly/common/types";
import { Coins, CreditCard, Home, Receipt } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Tabs, SplashScreen } from "expo-router";
import React, { useEffect } from "react";

import TabBar from "../../components/shared/TabBar";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

const tabs = [
  { name: "index", title: "Home", Icon: Home },
  { name: "card", title: "Card", Icon: CreditCard },
  { name: "payments", title: "Payments", Icon: Coins },
  { name: "activity", title: "Activity", Icon: Receipt },
];

export default function AppLayout() {
  const { error: noPasskey, isLoading, isFetched } = useQuery<Passkey>({ queryKey: ["passkey"] }, queryClient);

  useEffect(() => {
    if (isLoading || !isFetched) return;
    SplashScreen.hideAsync().catch(handleError);
  }, [isFetched, isLoading]);

  if (noPasskey) return <Redirect href="onboarding" />;
  if (isLoading || !isFetched) return;
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
