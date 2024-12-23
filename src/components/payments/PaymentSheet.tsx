import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Sheet } from "tamagui";

import PaymentSheetContent from "./PaymentSheetContent";

export default function PaymentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const maturity = useLocalSearchParams().maturity as string | undefined;
  return (
    <Sheet
      open={open}
      dismissOnSnapToBottom
      unmountChildrenWhenHidden
      forceRemoveScrollEnabled={open}
      animation="moderate"
      dismissOnOverlayPress
      onOpenChange={onClose}
      snapPointsMode="fit"
      zIndex={100_000}
      modal
    >
      <Sheet.Overlay
        backgroundColor="#00000090"
        animation="quicker"
        enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
        exitStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
      />
      <Sheet.Handle />
      <Sheet.Frame>{maturity && <PaymentSheetContent maturity={maturity} onClose={onClose} />}</Sheet.Frame>
    </Sheet>
  );
}
