import { router } from "expo-router";
import React from "react";
import { Button, View } from "tamagui";

import Balance from "./Balance";
import BaseLayout from "../shared/BaseLayout";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";

const startOnboarding = () => {
  router.push("onboarding");
};

const Home = () => {
  return (
    <SafeView>
      <BaseLayout>
        <View gap={40}>
          <ProfileHeader />
          <Balance />
          <Button
            variant="outlined"
            backgroundColor="$interactiveBaseBrandDefault"
            color="$textInteractiveBaseBrandDefault"
            onPress={startOnboarding}
            fontWeight={600}
          >
            Start Onboarding
          </Button>
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Home;
