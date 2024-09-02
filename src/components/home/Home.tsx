import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Balance from "./Balance";
import CreditLimit from "./CreditLimit";
import HomeActions from "./HomeActions";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function Home() {
  return (
    <SafeView fullScreen tab>
      <ProfileHeader />
      <ScrollView>
        <View gap={ms(20)} flex={1} padded>
          <Balance />
          <HomeActions />
          <CreditLimit />
        </View>
      </ScrollView>
    </SafeView>
  );
}
