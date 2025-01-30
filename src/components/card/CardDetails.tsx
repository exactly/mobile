import { Copy, Snowflake, X } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import React, { useEffect, useState } from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, Sheet, Spinner, Square, Switch, XStack, YStack } from "tamagui";

import CardBack from "./CardBack";
import DismissableAlert from "./DismissableAlert";
import handleError from "../../utils/handleError";
import { decrypt } from "../../utils/panda";
import queryClient from "../../utils/queryClient";
import { getCard, setCardStatus } from "../../utils/server";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardDetails({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const toast = useToastController();
  const { data: card, isFetching: isFetchingCard } = useQuery({ queryKey: ["card", "details"], queryFn: getCard });
  const {
    mutateAsync: changeCardStatus,
    isPending: isSettingCardStatus,
    variables: optimisticCardStatus,
  } = useMutation({
    mutationKey: ["card", "status"],
    mutationFn: setCardStatus,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "details"] });
    },
  });
  const displayStatus = isSettingCardStatus ? optimisticCardStatus : card?.status;
  const [details, setDetails] = useState({ pan: "", cvc: "" });
  useEffect(() => {
    if (card && card.provider === "panda") {
      Promise.all([
        decrypt(card.encryptedPan.data, card.encryptedPan.iv, card.secret),
        decrypt(card.encryptedCvc.data, card.encryptedCvc.iv, card.secret),
      ])
        .then(([pan, cvc]) => {
          setDetails({ pan, cvc });
        })
        .catch(handleError);
    }
  }, [card]);
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
      <Sheet.Frame>
        <SafeView paddingTop={0} fullScreen borderTopLeftRadius="$r4" borderTopRightRadius="$r4">
          <ScrollView>
            <View fullScreen flex={1}>
              <View gap="$s5" flex={1} padded>
                {card ? (
                  card.provider === "panda" ? (
                    <YStack
                      borderRadius="$s3"
                      borderWidth={1}
                      borderColor="$borderNeutralSoft"
                      backgroundColor="$uiNeutralPrimary"
                      padding="$s5"
                      paddingVertical="$s6"
                      justifyContent="space-between"
                      gap="$s6"
                    >
                      <XStack gap="$s4" alignItems="center">
                        <Text emphasized headline letterSpacing={2} fontFamily="$mono" color="$uiNeutralInversePrimary">
                          {details.pan.match(/.{1,4}/g)?.join(" ") ?? ""}
                        </Text>
                        <Copy
                          hitSlop={20}
                          size={16}
                          color="$uiNeutralInversePrimary"
                          strokeWidth={2.5}
                          onPress={() => {
                            setStringAsync(details.pan).catch(handleError);
                            toast.show("Copied to clipboard!");
                          }}
                        />
                      </XStack>
                      <XStack gap="$s5" alignItems="center">
                        <XStack alignItems="center" gap="$s3">
                          <Text caption color="$uiNeutralInverseSecondary">
                            Expires
                          </Text>
                          <Text
                            emphasized
                            headline
                            letterSpacing={2}
                            fontFamily="$mono"
                            color="$uiNeutralInversePrimary"
                          >
                            {`${card.expirationMonth}/${card.expirationYear}`}
                          </Text>
                        </XStack>
                        <XStack alignItems="center" gap="$s3">
                          <Text caption color="$uiNeutralInverseSecondary">
                            CVV&nbsp;
                          </Text>
                          <Text
                            emphasized
                            headline
                            letterSpacing={2}
                            fontFamily="$mono"
                            color="$uiNeutralInversePrimary"
                          >
                            {details.cvc}
                          </Text>
                        </XStack>
                      </XStack>
                      <YStack>
                        <Text emphasized headline letterSpacing={2} color="$uiNeutralInversePrimary">
                          {card.displayName}
                        </Text>
                      </YStack>
                    </YStack>
                  ) : (
                    <CardBack uri={card.url} />
                  )
                ) : null}
                <XStack
                  width="100%"
                  paddingHorizontal="$s4"
                  paddingVertical="$s3_5"
                  borderRadius="$r3"
                  borderWidth={1}
                  borderColor="$borderNeutralSoft"
                  justifyContent="space-between"
                  alignItems="center"
                  onPress={() => {
                    if (isFetchingCard || isSettingCardStatus) return;
                    changeCardStatus(card?.status === "FROZEN" ? "ACTIVE" : "FROZEN").catch(handleError);
                  }}
                >
                  <XStack alignItems="center" gap="$s3">
                    <Square size={ms(24)}>
                      {isSettingCardStatus ? (
                        <Spinner width={ms(24)} color="$interactiveBaseBrandDefault" alignSelf="flex-start" />
                      ) : (
                        <Snowflake size={ms(24)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
                      )}
                    </Square>
                    <Text subHeadline color="$uiNeutralPrimary">
                      {displayStatus === "FROZEN" ? "Unfreeze card" : "Freeze card"}
                    </Text>
                  </XStack>
                  <Switch
                    height={24}
                    pointerEvents="none"
                    checked={displayStatus === "FROZEN"}
                    backgroundColor="$backgroundMild"
                    borderColor="$borderNeutralSoft"
                  >
                    <Switch.Thumb
                      checked={displayStatus === "FROZEN"}
                      shadowColor="$uiNeutralSecondary"
                      animation="moderate"
                      backgroundColor={
                        displayStatus === "ACTIVE" ? "$interactiveDisabled" : "$interactiveBaseBrandDefault"
                      }
                    />
                  </Switch>
                </XStack>
                {card && card.provider === "cryptomate" && alertShown && (
                  <DismissableAlert
                    text="Manually add your card to Apple Pay & Google Pay to make contactless payments."
                    onDismiss={() => {
                      queryClient.setQueryData(["settings", "alertShown"], false);
                    }}
                  />
                )}
                <Button
                  main
                  noFlex
                  outlined
                  spaced
                  iconAfter={<X size={ms(20)} color="$interactiveOnBaseBrandSoft" fontWeight="bold" />}
                  onPress={onClose}
                >
                  Close
                </Button>
              </View>
            </View>
          </ScrollView>
        </SafeView>
      </Sheet.Frame>
    </Sheet>
  );
}
