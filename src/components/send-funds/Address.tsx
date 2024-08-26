import { ArrowLeft, ArrowRight, QrCode, SwitchCamera } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ButtonIcon, ScrollView, XStack, YStack } from "tamagui";
import * as v from "valibot";
import { isAddress, type Address } from "viem";

import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import Button from "../shared/Button";
import Input from "../shared/Input";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AddressSelection() {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const { data } = useQuery<{
    receiver?: Address;
    market?: Address;
    amount: bigint;
  }>({ queryKey: ["withdrawal"] });
  const { Field, Subscribe, handleSubmit, setFieldValue } = useForm<{ receiver: string }, ValibotValidator>({
    defaultValues: { receiver: data?.receiver ?? "" },
    onSubmit: ({ value: { receiver } }) => {
      queryClient.setQueryData<{ receiver?: Address; market?: Address; amount: bigint }>(["withdrawal"], (old) => {
        return old
          ? { ...old, receiver: receiver as Address }
          : { receiver: receiver as Address, market: undefined, amount: 0n };
      });
      router.push("/send-funds/asset");
    },
  });
  const { canGoBack } = router;
  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  queryClient.setQueryData(["withdrawal"], {
                    receiver: undefined,
                    market: undefined,
                    amount: 0n,
                  });
                  router.back();
                }}
              >
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold">
            Send to
          </Text>
        </View>
        <ScrollView flex={1}>
          <YStack gap="$s5">
            <Field
              name="receiver"
              validatorAdapter={valibotValidator()}
              validators={{
                onChange: v.pipe(
                  v.string(),
                  v.check((value) => isAddress(value), "invalid address"),
                ),
              }}
            >
              {({ state: { value, meta }, handleChange }) => (
                <YStack gap="$s2">
                  <XStack flexDirection="row">
                    <Input
                      neutral
                      flex={1}
                      placeholder="ENS, Name, Address"
                      borderRightColor="transparent"
                      borderTopRightRadius={0}
                      borderBottomRightRadius={0}
                      value={value}
                      onChangeText={handleChange}
                    />
                    <Button
                      outlined
                      borderColor="$borderNeutralSoft"
                      borderTopLeftRadius={0}
                      borderBottomLeftRadius={0}
                      borderLeftWidth={0}
                      onPress={() => {
                        if (!permission?.granted) {
                          setCameraOn(false);
                          return;
                        }
                        setCameraOn(!cameraOn);
                      }}
                    >
                      <ButtonIcon>
                        <QrCode size={ms(32)} />
                      </ButtonIcon>
                    </Button>
                  </XStack>
                  {meta.errors.length > 0 ? (
                    <Text padding="$s3" footnote color="$uiNeutralSecondary">
                      {meta.errors[0]?.toString().split(",")[0]}
                    </Text>
                  ) : undefined}
                </YStack>
              )}
            </Field>

            {permission && permission.granted && cameraOn && (
              <View minHeight={ms(300)}>
                <CameraView
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={({ data: value }) => {
                    setFieldValue("receiver", value);
                    setCameraOn(false);
                  }}
                  facing={cameraFacing}
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ flex: 1 }}
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
                </CameraView>
              </View>
            )}

            {!permission?.granted && (
              <View gap="$s5">
                <Text textAlign="center" emphasized footnote color="$uiNeutralSecondary">
                  We need your permission to show the camera.
                </Text>
                <Button
                  outlined
                  onPress={() => {
                    requestPermission().catch(handleError);
                  }}
                >
                  Grant permission
                </Button>
              </View>
            )}

            <Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => {
                return (
                  <Button
                    contained
                    main
                    spaced
                    disabled={!canSubmit}
                    iconAfter={
                      <ArrowRight color={canSubmit ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
                    }
                    onPress={() => {
                      handleSubmit().catch(handleError);
                    }}
                  >
                    Next
                  </Button>
                );
              }}
            </Subscribe>
          </YStack>
        </ScrollView>
      </View>
    </SafeView>
  );
}
