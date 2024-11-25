import { Info } from "@tamagui/lucide-icons";
import { Toast, useToastState } from "@tamagui/toast";
import React from "react";
import { ms } from "react-native-size-matters";
import { XStack } from "tamagui";

import Text from "./Text";
import View from "./View";

export default function NotificationToast() {
  const toast = useToastState();
  if (!toast || toast.isHandledNatively) return null;
  return (
    <Toast
      key={toast.id}
      duration={toast.duration}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }} // eslint-disable-line react-native/no-inline-styles
      exitStyle={{ opacity: 0, scale: 1, y: -20 }} // eslint-disable-line react-native/no-inline-styles
      backgroundColor="$backgroundSoft"
      borderColor="$borderSuccessSoft"
      borderWidth={1}
      opacity={1}
      scale={1}
      animation="quicker"
      viewportName={toast.viewportName}
      borderRadius="$s3"
    >
      <XStack justifyContent="space-between" alignItems="center" backgroundColor="transparent" alignSelf="center">
        <View
          padding="$s4"
          justifyContent="center"
          alignItems="center"
          backgroundColor="$interactiveBaseSuccessSoftDefault"
          borderTopLeftRadius="$s3"
          borderBottomLeftRadius="$s3"
        >
          <Info size={ms(24)} color="$uiSuccessSecondary" />
        </View>
        <View padding="$s4">
          <Toast.Title>
            <Text footnote color="$uiSuccessPrimary">
              {toast.title}
            </Text>
          </Toast.Title>
        </View>
      </XStack>
    </Toast>
  );
}
