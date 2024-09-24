import { Address } from "@exactly/common/types";
import { ArrowLeft, ArrowRight, QrCode, SwitchCamera } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { ButtonIcon, ScrollView, Separator, XStack, YStack } from "tamagui";
import { parse } from "valibot";

import Contacts from "./Contacts";
import RecentContacts from "./RecentContacts";
import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import Button from "../shared/Button";
import Input from "../shared/Input";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AddressSelection() {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("back");
  const { data: recentContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "recent"],
  });
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  const { canGoBack } = router;
  const [permission, requestPermission] = useCameraPermissions();
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { Field, Subscribe, handleSubmit, setFieldValue, validateAllFields } = useForm<
    { receiver: string },
    ValibotValidator
  >({
    defaultValues: { receiver: withdraw?.receiver ?? "" },
    onSubmit: ({ value }) => {
      const receiver = parse(Address, value.receiver);
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) =>
        old ? { ...old, receiver } : { receiver, market: undefined, amount: 0n },
      );
      router.push("/send-funds/asset");
    },
  });
  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  queryClient.setQueryData(["withdrawal"], { receiver: undefined, market: undefined, amount: 0n });
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
            <Field name="receiver" validatorAdapter={valibotValidator()} validators={{ onChange: Address }}>
              {({ state: { value, meta }, handleChange }) => (
                <YStack gap="$s2">
                  <XStack flexDirection="row">
                    <Input
                      neutral
                      flex={1}
                      placeholder="Enter address"
                      borderColor="$uiNeutralTertiary"
                      borderRightColor="transparent"
                      borderTopRightRadius={0}
                      borderBottomRightRadius={0}
                      value={value}
                      onChangeText={handleChange}
                    />
                    <Button
                      outlined
                      borderColor="$uiNeutralTertiary"
                      borderTopLeftRadius={0}
                      borderBottomLeftRadius={0}
                      borderLeftWidth={0}
                      onPress={() => {
                        if (permission?.granted) setCameraOn(!cameraOn);
                        if (!permission?.granted) {
                          requestPermission().catch(handleError);
                          setCameraOn(true);
                        }
                      }}
                    >
                      <ButtonIcon>
                        <QrCode size={ms(32)} color="$interactiveOnBaseBrandSoft" />
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
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={({ data: address }) => {
                    setFieldValue("receiver", address);
                    validateAllFields("change").catch(handleError);
                    setCameraOn(false);
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
                </CameraView>
              </View>
            )}

            {recentContacts && recentContacts.length > 0 && (
              <RecentContacts
                onContactPress={(address) => {
                  setFieldValue("receiver", address);
                  validateAllFields("change").catch(handleError);
                }}
              />
            )}
            {recentContacts && savedContacts && <Separator borderColor="$borderNeutralSoft" />}
            {savedContacts && savedContacts.length > 0 && (
              <Contacts
                onContactPress={(address) => {
                  setFieldValue("receiver", address);
                  validateAllFields("change").catch(handleError);
                }}
              />
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

const styles = StyleSheet.create({ cameraView: { flex: 1 } });
