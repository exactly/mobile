import { router } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { Text, View } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

function back() {
  router.back();
}

export default function AddFunds() {
  return (
    <SafeView>
      <BaseLayout>
        <TouchableOpacity onPress={back}>
          <View justifyContent="space-between" alignItems="center">
            <Text>Back</Text>
          </View>
        </TouchableOpacity>
      </BaseLayout>
    </SafeView>
  );
}
