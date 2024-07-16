import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text } from "tamagui";

const screenStyle = {
  flex: 1,
  backgroundColor: "transparent",
};

const scrollViewStyle = {
  flex: 1,
  backgroundColor: "transparent",
  gap: 20,
};

const Activity = () => {
  return (
    <SafeAreaView style={screenStyle}>
      <View display="flex" flex={1} height="100%" gap={20} padding={16} backgroundColor="$backgroundSoft">
        <ScrollView style={scrollViewStyle}>
          <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
            Activity
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Activity;
