import React from "react";
import { View } from "tamagui";

import Balance from "./Balance";
import HomeActions from "./HomeActions";
import BaseLayout from "../shared/BaseLayout";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";

const Home = () => {
  return (
    <SafeView>
      <BaseLayout>
        <View gap={40}>
          <ProfileHeader />
          <Balance />
          <HomeActions />
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Home;
