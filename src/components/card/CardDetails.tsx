import { Snowflake, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { ms } from "react-native-size-matters";
import { ScrollView, Sheet, Spinner, Square, Switch, XStack } from "tamagui";
import { nonEmpty, pipe, safeParse, string, url } from "valibot";

import CardBack from "./CardBack";
import DismissableAlert from "./DismissableAlert";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import { getCard, setCardStatus } from "../../utils/server";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardDetails({ open, onClose, uri }: { open: boolean; onClose: () => void; uri?: string }) {
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const { success, output } = safeParse(pipe(string(), nonEmpty("empty url"), url("bad url")), uri);
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
                {success && <CardBack uri={output} />}

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

                {success && alertShown && (
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
