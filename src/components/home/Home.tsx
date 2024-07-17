import React from "react";
import { View } from "tamagui";

import Balance from "./Balance";
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
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Home;
