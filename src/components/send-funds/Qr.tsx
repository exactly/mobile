import { Address } from "@exactly/common/validation";
import { ArrowLeft, BoxSelect, SwitchCamera } from "@tamagui/lucide-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { useWindowDimensions } from "tamagui";
import { safeParse } from "valibot";

import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import View from "../shared/View";

export default function Qr() {
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const { height, width } = useWindowDimensions();
  if (!permission?.granted && permission?.canAskAgain) {
    requestPermission().catch((error: unknown) => {
      handleError(error);
      router.back();
    });
  }
  return (
    <View fullScreen>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data: receiver }) => {
          const result = safeParse(Address, receiver);
          if (result.success) {
            router.navigate({ pathname: "/send-funds", params: { receiver: result.output } });
          }
        }}
        facing={cameraFacing}
        style={styles.cameraView}
        autofocus="on"
      >
        <Button
          position="absolute"
          borderRadius="$r_0"
          backgroundColor="$interactiveBaseBrandDefault"
          bottom="$s4"
          right="$s4"
          padding="$s3"
          onPress={() => {
            setCameraFacing(cameraFacing === "back" ? "front" : "back");
          }}
        >
          <SwitchCamera size={ms(24)} color="$interactiveOnBaseBrandDefault" />
        </Button>
        <View
          position="absolute"
          borderRadius="$r_0"
          backgroundColor="transparent"
          top="$s4"
          left="$s4"
          padding="$s3"
          onPress={() => {
            router.back();
          }}
        >
          <ArrowLeft size={ms(24)} color="white" />
        </View>
        <View position="absolute" fullScreen justifyContent="center" alignItems="center">
          <BoxSelect size={ms(Math.min(width, height) * 0.5)} color="white" />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({ cameraView: { flex: 1 } });
