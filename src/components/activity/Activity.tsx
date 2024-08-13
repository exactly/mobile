import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Activity() {
  return (
    <SafeView fullScreen tab>
      <ScrollView>
        <View fullScreen padded>
          <View flexDirection="row" gap={ms(10)} justifyContent="flex-start" alignItems="center">
            <Text fontSize={ms(20)} fontWeight="bold">
              Activity
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
