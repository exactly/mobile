import { X } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { Sheet } from "tamagui";

import View from "../shared/View";

interface PaymentTypeProperties {
  isVisible: boolean;
  children?: React.ReactNode;
  onClose: () => void;
}

export default function PaymentModal({ isVisible, children, onClose }: PaymentTypeProperties) {
  return (
    <Sheet
      modal
      open={isVisible}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
        }
      }}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      unmountChildrenWhenHidden
    >
      <Sheet.Overlay backgroundColor="transparent" />
      <Sheet.Handle />
      <Sheet.Frame
        backgroundColor="$backgroundSoft"
        borderTopLeftRadius="$r3"
        borderTopRightRadius="$r3"
        elevation={10}
      >
        <View>
          <View alignSelf="flex-end" paddingRight="$s5" paddingVertical="$s4">
            <Pressable onPress={onClose}>
              <X color="$uiNeutralSecondary" />
            </Pressable>
          </View>
          {children}
        </View>
      </Sheet.Frame>
    </Sheet>
  );
}
