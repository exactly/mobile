import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "tamagui";

import Balance from "./Balance";
import MainActions from "./MainActions";
import ProfileHeader from "../shared/ProfileHeader";

const screenStyle = { flex: 1, backgroundColor: "transparent" };
const scrollViewStyle = { flex: 1, backgroundColor: "transparent", gap: 20 };

const Home = () => {
  return (
    <SafeAreaView style={screenStyle}>
      <View flex={1} height="100%" gap={20} padding={16} backgroundColor="$backgroundSoft">
        <ProfileHeader />
        <ScrollView style={scrollViewStyle}>
          <View gap={40}>
            <Balance />
            <MainActions />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Home;
