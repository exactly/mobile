import { ArrowRight } from "phosphor-react-native";
import React from "react";
import { moderateScale } from "react-native-size-matters";
import { Text, View } from "tamagui";

import SuccessImage from "../../assets/images/account-created.svg";
import Blob from "../../assets/images/onboarding-blob-06.svg";
import BaseLayout from "../shared/BaseLayout";
import DelayedActionButton from "../shared/DelayedActionButton";
import SafeView from "../shared/SafeView";

const Success = () => {
  return (
    <SafeView>
      <BaseLayout>
        <View flex={1}>
          <View display="flex" alignItems="center" alignContent="center" justifyContent="center" height="100%" flex={1}>
            <View
              display="flex"
              alignItems="center"
              alignContent="center"
              justifyContent="center"
              height="100%"
              position="absolute"
              marginHorizontal={moderateScale(20)}
            >
              <Blob />
            </View>
            <View
              display="flex"
              alignItems="center"
              alignContent="center"
              justifyContent="center"
              height="100%"
              flex={1}
            >
              <SuccessImage />
            </View>
          </View>

          <View
            flexDirection="column"
            paddingVertical={moderateScale(10)}
            paddingHorizontal={moderateScale(20)}
            gap={moderateScale(40)}
          >
            <Text fontSize={moderateScale(28)} fontWeight={700} color="$interactiveBaseBrandDefault" textAlign="center">
              Account created successfully!
            </Text>

            <View flexDirection="column" gap={moderateScale(10)}>
              <DelayedActionButton
                content="Start account setup"
                onPress={() => {
                  // TODO Implement account setup
                }}
                Icon={ArrowRight}
              />
            </View>
          </View>
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Success;
