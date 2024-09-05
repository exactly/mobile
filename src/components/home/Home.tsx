import React from "react";
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
      <ScrollView backgroundColor="$backgroundMild">
        <View gap="$s4_5" flex={1}>
          <View backgroundColor="$backgroundSoft" padded gap="$s8">
            <Balance />
            <HomeActions />
          </View>
          <View padded>
            <CreditLimit />
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
