import chain from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { ArrowLeft, ArrowRight, QrCode, SwitchCamera } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { type ValibotValidator, valibotValidator } from "@tanstack/valibot-form-adapter";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ms } from "react-native-size-matters";
import { ButtonIcon, ScrollView, Separator, XStack, YStack } from "tamagui";
import { parse } from "valibot";

import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import Button from "../shared/Button";
import Input from "../shared/Input";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";
import Contacts from "./Contacts";
import RecentContacts from "./RecentContacts";

export default function AddressSelection() {
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const { data: recentContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "recent"],
  });
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  const { canGoBack } = router;
  const [permission, requestPermission] = useCameraPermissions();
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { Field, handleSubmit, setFieldValue, Subscribe, validateAllFields } = useForm<
    { receiver: string },
    ValibotValidator
  >({
    defaultValues: { receiver: withdraw?.receiver ?? "" },
    onSubmit: ({ value }) => {
      const receiver = parse(Address, value.receiver);
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) =>
        old ? { ...old, receiver } : { amount: 0n, market: undefined, receiver },
      );
      router.push("/send-funds/asset");
    },
  });
  return (
    <SafeView fullScreen>
      <View fullScreen gap={ms(20)} padded>
        <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-around">
          <View left={0} position="absolute">
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  queryClient.setQueryData(["withdrawal"], { amount: 0n, market: undefined, receiver: undefined });
                  router.back();
                }}
              >
                <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
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
              {({ handleChange, state: { meta, value } }) => (
                <YStack gap="$s2">
                  <XStack flexDirection="row">
                    <Input
                      borderBottomRightRadius={0}
                      borderColor="$uiNeutralTertiary"
                      borderRightColor="transparent"
                      borderTopRightRadius={0}
                      flex={1}
                      neutral
                      onChangeText={handleChange}
                      placeholder={`Enter ${chain.name} address`}
                      value={value}
                    />
                    <Button
                      borderBottomLeftRadius={0}
                      borderColor="$uiNeutralTertiary"
                      borderLeftWidth={0}
                      borderTopLeftRadius={0}
                      onPress={() => {
                        if (permission?.granted) setCameraOn(!cameraOn);
                        if (!permission?.granted) {
                          requestPermission().catch(handleError);
                          setCameraOn(true);
                        }
                      }}
                      outlined
                    >
                      <ButtonIcon>
                        <QrCode color="$interactiveOnBaseBrandSoft" size={ms(32)} />
                      </ButtonIcon>
                    </Button>
                  </XStack>
                  {meta.errors.length > 0 ? (
                    <Text color="$uiNeutralSecondary" footnote padding="$s3">
                      {meta.errors[0]?.toString().split(",")[0]}
                    </Text>
                  ) : undefined}
                </YStack>
              )}
            </Field>

            {permission && permission.granted && cameraOn && (
              <View minHeight={ms(300)}>
                <CameraView
                  autofocus="on"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  facing={cameraFacing}
                  onBarcodeScanned={({ data: address }) => {
                    setFieldValue("receiver", address);
                    validateAllFields("change").catch(handleError);
                    setCameraOn(false);
                  }}
                  style={styles.cameraView}
                >
                  <Button
                    backgroundColor="$interactiveBaseBrandDefault"
                    borderRadius="$r_0"
                    bottom="$s4"
                    onPress={() => {
                      setCameraFacing(cameraFacing === "back" ? "front" : "back");
                    }}
                    padding="$s3"
                    position="absolute"
                    right="$s4"
                  >
                    <SwitchCamera color="$interactiveOnBaseBrandDefault" size={ms(24)} />
                  </Button>
                </CameraView>
              </View>
            )}

            {(recentContacts ?? savedContacts) && (
              <ScrollView maxHeight={350} space="$s4">
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
              </ScrollView>
            )}

            <Text color="$uiNeutralPlaceholder" fontSize={ms(13)} lineHeight={ms(16)} textAlign="justify">
              Make sure that the receiving address is compatible with {chain.name} network. Sending assets on other
              networks may result in irreversible loss of funds.
              <Text color="$uiBrandSecondary" fontSize={ms(13)} fontWeight="bold" lineHeight={ms(16)}>
                &nbsp;Learn more about sending funds
              </Text>
            </Text>

            <Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => {
                return (
                  <Button
                    contained
                    disabled={!canSubmit}
                    iconAfter={
                      <ArrowRight color={canSubmit ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
                    }
                    main
                    onPress={() => {
                      handleSubmit().catch(handleError);
                    }}
                    spaced
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
